import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { processMessage as validateTransaction } from './agents/transaction-validator';
import { processMessage as scoreFraud } from './agents/fraud-detector';
import { processMessage as settleTransaction } from './agents/settlement-processor';
import {
  setupSharedDirectories,
  clearSharedDirectories,
  writeInputMessage,
  readInputMessage,
  writeOutputMessage,
  readOutputMessage,
  writeResult,
  moveToProcessing,
  moveOutputToProcessing,
  readProcessingMessage,
  removeFromProcessing,
  SHARED_PATHS,
} from './utils/file-io';
import { logger } from './utils/logger';
import {
  RawTransaction,
  ValidatedTransaction,
  FraudScoredTransaction,
  SettledTransaction,
  RejectedTransaction,
  PipelineResult,
} from './types/transaction';
import { TransactionMessage } from './types/message';

/**
 * Pipeline result tracking for summary report
 */
interface PipelineStats {
  total: number;
  validated: number;
  rejected: number;
  settled: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  results: PipelineResult[];
}

/**
 * Create a message envelope for inter-agent communication
 * @param data Payload data for the message
 * @param sourceAgent Name of source agent
 * @param targetAgent Name of target agent
 * @param messageType Type of message
 * @returns Message envelope
 */
function createMessageEnvelope(
  data: any,
  sourceAgent: string,
  targetAgent: string,
  messageType: string = 'transaction'
): any {
  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_agent: sourceAgent,
    target_agent: targetAgent,
    message_type: messageType,
    data,
  };
}

/**
 * Process a single transaction through the full pipeline using file-based message passing.
 *
 * Flow:
 *   1. Integrator writes message envelope to shared/input/{txn_id}.json
 *   2. Move to shared/processing/ (validator picks up)
 *   3. Validator reads from processing, validates, result written to shared/output/
 *   4. If rejected → write to shared/results/ and stop
 *   5. Move from output/ to processing/ (fraud detector picks up)
 *   6. Fraud detector reads from processing, scores, result written to shared/output/
 *   7. Move from output/ to processing/ (settlement processor picks up)
 *   8. Settlement reads from processing, settles, final result written to shared/results/
 *
 * @param transaction Raw transaction
 * @param validateOnly If true, only run validator
 * @returns Final pipeline result
 */
function processTransaction(
  transaction: RawTransaction,
  validateOnly: boolean = false
): PipelineResult {
  const txnId = transaction.transaction_id;

  try {
    // --- Step 1: Write initial message to shared/input/ ---
    logger.info('Writing transaction to input queue', { transaction_id: txnId });
    const inputEnvelope = createMessageEnvelope(
      { transaction },
      'integrator',
      'transaction_validator',
      'transaction'
    );
    writeInputMessage(txnId, inputEnvelope);

    // --- Step 2: Move from input/ to processing/ (validator picks up) ---
    moveToProcessing(txnId);
    const validatorInput = readProcessingMessage(txnId) as TransactionMessage;

    // --- Step 3: Run Transaction Validator ---
    logger.info('Validator processing transaction', { transaction_id: txnId });
    const validationResult = validateTransaction(validatorInput);
    removeFromProcessing(txnId);

    // --- Step 4: Handle rejection ---
    if (validationResult.status === 'rejected') {
      const rejectedResult = validationResult as RejectedTransaction;
      logger.warn('Transaction rejected by validator', {
        transaction_id: txnId,
        reasons: rejectedResult.reasons.join(', '),
      });

      // Write rejection result directly to shared/results/
      const rejectionEnvelope = createMessageEnvelope(
        { ...rejectedResult },
        'transaction_validator',
        'results',
        'transaction'
      );
      writeResult(txnId, rejectionEnvelope);
      return rejectedResult;
    }

    // If validate-only, stop here
    if (validateOnly) {
      logger.info('Validation complete (validate-only mode)', { transaction_id: txnId });
      const validatedEnvelope = createMessageEnvelope(
        { transaction: validationResult },
        'transaction_validator',
        'results',
        'validation'
      );
      writeResult(txnId, validatedEnvelope);
      return { ...transaction, status: 'validated' } as any;
    }

    // --- Step 5: Write validated result to shared/output/ for fraud detector ---
    const validatedTxn = validationResult as ValidatedTransaction;
    const validationEnvelope = createMessageEnvelope(
      { transaction: validatedTxn, status: 'validated' },
      'transaction_validator',
      'fraud_detector',
      'validation'
    );
    writeOutputMessage(txnId, validationEnvelope);

    // --- Step 6: Move from output/ to processing/ (fraud detector picks up) ---
    moveOutputToProcessing(txnId);
    const fraudInput = readProcessingMessage(txnId);

    // --- Step 7: Run Fraud Detector ---
    logger.info('Fraud detector scoring transaction', { transaction_id: txnId });
    const fraudResult = scoreFraud(fraudInput.data.transaction as ValidatedTransaction);
    removeFromProcessing(txnId);

    // --- Step 8: Write fraud result to shared/output/ for settlement processor ---
    const fraudEnvelope = createMessageEnvelope(
      {
        transaction: fraudResult,
        fraud_risk_score: fraudResult.fraud_risk_score,
        fraud_risk_level: fraudResult.fraud_risk_level,
      },
      'fraud_detector',
      'settlement_processor',
      'fraud_check'
    );
    writeOutputMessage(txnId, fraudEnvelope);

    // --- Step 9: Move from output/ to processing/ (settlement processor picks up) ---
    moveOutputToProcessing(txnId);
    const settlementInput = readProcessingMessage(txnId);

    // --- Step 10: Run Settlement Processor ---
    logger.info('Settlement processor settling transaction', { transaction_id: txnId });
    const settlementResult = settleTransaction(
      settlementInput.data.transaction as FraudScoredTransaction
    );
    removeFromProcessing(txnId);

    // --- Step 11: Write final result to shared/results/ ---
    const settlementEnvelope = createMessageEnvelope(
      { transaction: settlementResult, settled_at: settlementResult.settled_at },
      'settlement_processor',
      'results',
      'settlement'
    );
    writeResult(txnId, settlementEnvelope);

    logger.info('Transaction settled', {
      transaction_id: txnId,
      settled_amount: settlementResult.settled_amount,
    });

    return settlementResult;
  } catch (error) {
    logger.error('Pipeline error', {
      transaction_id: txnId,
      error: error instanceof Error ? error.message : String(error),
    });

    // Clean up processing directory on error
    removeFromProcessing(txnId);

    const errorResult: RejectedTransaction = {
      transaction_id: txnId,
      status: 'rejected',
      reasons: ['PIPELINE_ERROR'],
      transaction,
    };

    writeResult(txnId, createMessageEnvelope(
      errorResult,
      'integrator',
      'results',
      'transaction'
    ));

    return errorResult;
  }
}

/**
 * Format a summary table for console output
 * @param stats Pipeline statistics
 * @returns Formatted table string
 */
export function formatSummaryTable(stats: PipelineStats): string {
  let table = '\n╔════════════════════════════════════════════════════════════════════════════════════╗\n';
  table += '║                          PIPELINE EXECUTION SUMMARY                                  ║\n';
  table += '╠════════════════════════════════════════════════════════════════════════════════════╣\n';

  // Header
  table += '║ TXN ID     │ Status    │ Risk Level │ Amount (USD)  │ Fraud Score │ Settled Amount ║\n';
  table += '╠════════════════════════════════════════════════════════════════════════════════════╣\n';

  // Results
  stats.results.forEach((result) => {
    const txnId = result.transaction_id.padEnd(10);
    const isRejected = 'reasons' in result;
    const status = (isRejected ? 'REJECTED' : 'SETTLED').padEnd(9);

    let riskLevel = '--';
    let fraudScore = '--';
    let amount = '--';
    let settledAmount = '--';

    if (!isRejected) {
      const settled = result as SettledTransaction;
      riskLevel = (settled.fraud_risk_level || '--').padEnd(10);
      fraudScore = (settled.fraud_risk_score?.toString() || '--').padEnd(11);
      settledAmount = (settled.settled_amount || '--').padEnd(14);
    } else {
      riskLevel = '--'.padEnd(10);
      fraudScore = '--'.padEnd(11);
      amount = '--'.padEnd(13);
      settledAmount = '--'.padEnd(14);
    }

    table += `║ ${txnId} │ ${status} │ ${riskLevel} │ ${amount} │ ${fraudScore} │ ${settledAmount} ║\n`;
  });

  table += '╠════════════════════════════════════════════════════════════════════════════════════╣\n';
  table += `║ TOTALS: Processed=${stats.total} Settled=${stats.settled} Rejected=${stats.rejected} │ Risk: LOW=${stats.lowRisk} MEDIUM=${stats.mediumRisk} HIGH=${stats.highRisk}      ║\n`;
  table += '╚════════════════════════════════════════════════════════════════════════════════════╝\n';

  return table;
}

/**
 * Main pipeline execution
 * @param validateOnly If true, only run validator agent
 * @returns Pipeline statistics
 */
export async function runPipeline(validateOnly: boolean = false): Promise<PipelineStats> {
  logger.info('Pipeline starting', { mode: validateOnly ? 'validate-only' : 'full' });

  // Setup and clear directories for a clean run
  setupSharedDirectories();
  clearSharedDirectories();

  // Load sample transactions
  const sampleTransactionsPath = path.join(process.cwd(), 'sample-transactions.json');
  const rawTransactions: RawTransaction[] = JSON.parse(
    fs.readFileSync(sampleTransactionsPath, 'utf-8')
  );

  // Initialize statistics
  const stats: PipelineStats = {
    total: rawTransactions.length,
    validated: 0,
    rejected: 0,
    settled: 0,
    lowRisk: 0,
    mediumRisk: 0,
    highRisk: 0,
    results: [],
  };

  // Process each transaction through file-based pipeline
  for (const rawTxn of rawTransactions) {
    const result = processTransaction(rawTxn, validateOnly);

    // Update statistics
    if ('reasons' in result && result.status === 'rejected') {
      stats.rejected++;
    } else {
      stats.validated++;
      if (!validateOnly) {
        stats.settled++;
        const settled = result as SettledTransaction;
        if (settled.fraud_risk_level === 'LOW') stats.lowRisk++;
        else if (settled.fraud_risk_level === 'MEDIUM') stats.mediumRisk++;
        else if (settled.fraud_risk_level === 'HIGH') stats.highRisk++;
      }
    }

    stats.results.push(result);
  }

  // Log completion
  logger.info('Pipeline complete', {
    total: stats.total,
    validated: stats.validated,
    rejected: stats.rejected,
    settled: stats.settled,
  });

  return stats;
}

/**
 * CLI entry point
 * Run with: npm run pipeline
 * Run with validate-only: npm run pipeline:validate
 */
/* istanbul ignore next */
async function main() {
  const validateOnly = process.argv.includes('--validate-only');

  try {
    const stats = await runPipeline(validateOnly);

    // Print summary table
    console.log(formatSummaryTable(stats));

    // Print results directory info
    console.log(`\n✅ All ${stats.total} transactions processed.`);
    console.log(`📁 Results written to: ${SHARED_PATHS.results}`);
    console.log(
      `📊 Result files: ${stats.results.length} JSON files in shared/results/ directory\n`
    );
  } catch (error) {
    logger.error('Pipeline failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run if executed directly
/* istanbul ignore next */
if (require.main === module) {
  main();
}

export { PipelineStats };
