process.env.NODE_ENV = 'test';

import fs from 'fs';
import os from 'os';
import path from 'path';
import { runPipeline, formatSummaryTable, PipelineStats } from '../../src/integrator';
import { SHARED_PATHS } from '../../src/utils/file-io';
import { SettledTransaction, RejectedTransaction, PipelineResult } from '../../src/types/transaction';

describe('Pipeline Integration', () => {
  // The pipeline reads sample-transactions.json from process.cwd().
  // We redirect cwd to a temp dir that contains a copy of the sample file.
  let originalCwd: () => string;
  let cwdDir: string;

  beforeEach(() => {
    cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-cwd-'));
    const samplePath = path.join(__dirname, '..', '..', 'sample-transactions.json');
    const sampleData = fs.readFileSync(samplePath, 'utf-8');
    fs.writeFileSync(path.join(cwdDir, 'sample-transactions.json'), sampleData);

    originalCwd = process.cwd;
    process.cwd = () => cwdDir;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    fs.rmSync(cwdDir, { recursive: true, force: true });
  });

  describe('full pipeline run', () => {
    it('should process all 8 transactions', async () => {
      const stats = await runPipeline(false);
      expect(stats.total).toBe(8);
      expect(stats.results).toHaveLength(8);
    });

    it('should reject TXN006 (invalid currency XYZ)', async () => {
      const stats = await runPipeline(false);
      const txn006 = stats.results.find((r) => r.transaction_id === 'TXN006');
      expect(txn006).toBeDefined();
      expect(txn006!.status).toBe('rejected');
      expect((txn006 as RejectedTransaction).reasons).toContain('INVALID_CURRENCY');
    });

    it('should reject TXN007 (negative amount)', async () => {
      const stats = await runPipeline(false);
      const txn007 = stats.results.find((r) => r.transaction_id === 'TXN007');
      expect(txn007).toBeDefined();
      expect(txn007!.status).toBe('rejected');
      expect((txn007 as RejectedTransaction).reasons).toContain('INVALID_AMOUNT');
    });

    it('should settle 6 transactions and reject 2', async () => {
      const stats = await runPipeline(false);
      expect(stats.settled).toBe(6);
      expect(stats.rejected).toBe(2);
    });

    it('should assign HIGH risk to TXN005 ($75,000 wire transfer)', async () => {
      const stats = await runPipeline(false);
      const txn005 = stats.results.find((r) => r.transaction_id === 'TXN005') as SettledTransaction;
      expect(txn005).toBeDefined();
      expect(txn005.fraud_risk_level).toBe('HIGH');
      expect(txn005.fraud_triggers).toContain('amount_above_10000');
      expect(txn005.fraud_triggers).toContain('amount_above_50000');
    });

    it('should assign MEDIUM risk to TXN002 ($25,000)', async () => {
      const stats = await runPipeline(false);
      const txn002 = stats.results.find((r) => r.transaction_id === 'TXN002') as SettledTransaction;
      expect(txn002).toBeDefined();
      expect(txn002.fraud_risk_level).toBe('MEDIUM');
      expect(txn002.fraud_triggers).toContain('amount_above_10000');
    });

    it('should assign LOW risk to TXN001 ($1,500 domestic)', async () => {
      const stats = await runPipeline(false);
      const txn001 = stats.results.find((r) => r.transaction_id === 'TXN001') as SettledTransaction;
      expect(txn001).toBeDefined();
      expect(txn001.fraud_risk_level).toBe('LOW');
      expect(txn001.fraud_risk_score).toBe(0);
    });

    it('should detect cross-border + unusual hour for TXN004 (EUR from DE at 02:47)', async () => {
      const stats = await runPipeline(false);
      const txn004 = stats.results.find((r) => r.transaction_id === 'TXN004') as SettledTransaction;
      expect(txn004).toBeDefined();
      expect(txn004.fraud_triggers).toContain('cross_border');
      expect(txn004.fraud_triggers).toContain('unusual_hour');
    });

    it('should write result files to shared/results/', async () => {
      await runPipeline(false);
      const files = fs.readdirSync(SHARED_PATHS.results);
      expect(files.length).toBeGreaterThanOrEqual(8);
    });

    it('should produce valid JSON in result files', async () => {
      await runPipeline(false);
      const files = fs.readdirSync(SHARED_PATHS.results).filter((f) => f.startsWith('TXN'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(SHARED_PATHS.results, file), 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });

    it('should track risk level counts correctly', async () => {
      const stats = await runPipeline(false);
      expect(stats.lowRisk + stats.mediumRisk + stats.highRisk).toBe(stats.settled);
    });

    it('should settle TXN008 ($3,200 domestic mobile transfer)', async () => {
      const stats = await runPipeline(false);
      const txn008 = stats.results.find((r) => r.transaction_id === 'TXN008') as SettledTransaction;
      expect(txn008).toBeDefined();
      expect(txn008.settled_amount).toBeDefined();
      expect(txn008.settlement_currency).toBe('USD');
    });
  });

  describe('validate-only mode', () => {
    it('should only validate without settling', async () => {
      const stats = await runPipeline(true);
      expect(stats.total).toBe(8);
      expect(stats.settled).toBe(0);
      expect(stats.validated).toBe(6);
      expect(stats.rejected).toBe(2);
    });

    it('should still reject invalid transactions in validate-only mode', async () => {
      const stats = await runPipeline(true);
      const txn006 = stats.results.find((r) => r.transaction_id === 'TXN006');
      expect(txn006!.status).toBe('rejected');
    });

    it('should have zero risk level counts in validate-only mode', async () => {
      const stats = await runPipeline(true);
      expect(stats.lowRisk).toBe(0);
      expect(stats.mediumRisk).toBe(0);
      expect(stats.highRisk).toBe(0);
    });

    it('should accept TXN003 ($9,999.99) in validate-only mode', async () => {
      const stats = await runPipeline(true);
      const txn003 = stats.results.find((r) => r.transaction_id === 'TXN003');
      expect(txn003).toBeDefined();
      expect(txn003!.status).not.toBe('rejected');
    });
  });

  describe('formatSummaryTable', () => {
    it('should format a table with settled transactions', () => {
      const stats: PipelineStats = {
        total: 2,
        validated: 2,
        rejected: 0,
        settled: 2,
        lowRisk: 1,
        mediumRisk: 1,
        highRisk: 0,
        results: [
          {
            transaction_id: 'TXN001',
            status: 'validated',
            amount: '1500.00',
            currency: 'USD',
            transaction_type: 'transfer',
            timestamp: '2026-03-16T10:00:00Z',
            source_account: 'ACC-1001',
            destination_account: 'ACC-2001',
            fraud_risk_score: 0,
            fraud_risk_level: 'LOW',
            fraud_triggers: [],
            converted_amount: '1500.00',
            original_currency: 'USD',
            settlement_currency: 'USD',
            fee_percentage: '0.10',
            fee_amount: '1.50',
            wire_surcharge: '0.00',
            total_fees: '1.50',
            settled_amount: '1498.50',
            settled_at: '2026-03-16T10:00:00Z',
          } as SettledTransaction,
          {
            transaction_id: 'TXN002',
            status: 'validated',
            amount: '25000.00',
            currency: 'USD',
            transaction_type: 'wire_transfer',
            timestamp: '2026-03-16T09:15:00Z',
            source_account: 'ACC-1002',
            destination_account: 'ACC-3001',
            fraud_risk_score: 3,
            fraud_risk_level: 'MEDIUM',
            fraud_triggers: ['amount_above_10000'],
            converted_amount: '25000.00',
            original_currency: 'USD',
            settlement_currency: 'USD',
            fee_percentage: '0.10',
            fee_amount: '25.00',
            wire_surcharge: '25.00',
            total_fees: '50.00',
            settled_amount: '24950.00',
            settled_at: '2026-03-16T10:00:00Z',
          } as SettledTransaction,
        ],
      };

      const table = formatSummaryTable(stats);
      expect(table).toContain('PIPELINE EXECUTION SUMMARY');
      expect(table).toContain('TXN001');
      expect(table).toContain('TXN002');
      expect(table).toContain('SETTLED');
      expect(table).toContain('Processed=2');
      expect(table).toContain('Settled=2');
      expect(table).toContain('Rejected=0');
    });

    it('should format a table with rejected transactions', () => {
      const stats: PipelineStats = {
        total: 1,
        validated: 0,
        rejected: 1,
        settled: 0,
        lowRisk: 0,
        mediumRisk: 0,
        highRisk: 0,
        results: [
          {
            transaction_id: 'TXN006',
            status: 'rejected',
            reasons: ['INVALID_CURRENCY'],
          } as RejectedTransaction,
        ],
      };

      const table = formatSummaryTable(stats);
      expect(table).toContain('TXN006');
      expect(table).toContain('REJECTED');
      expect(table).toContain('Rejected=1');
    });

    it('should format a table with mixed settled and rejected', () => {
      const stats: PipelineStats = {
        total: 2,
        validated: 1,
        rejected: 1,
        settled: 1,
        lowRisk: 1,
        mediumRisk: 0,
        highRisk: 0,
        results: [
          {
            transaction_id: 'TXN001',
            status: 'validated',
            amount: '100.00',
            currency: 'USD',
            transaction_type: 'transfer',
            timestamp: '2026-03-16T10:00:00Z',
            source_account: 'ACC-1001',
            destination_account: 'ACC-2001',
            fraud_risk_score: 0,
            fraud_risk_level: 'LOW',
            fraud_triggers: [],
            converted_amount: '100.00',
            original_currency: 'USD',
            settlement_currency: 'USD',
            fee_percentage: '0.10',
            fee_amount: '0.10',
            wire_surcharge: '0.00',
            total_fees: '0.10',
            settled_amount: '99.90',
            settled_at: '2026-03-16T10:00:00Z',
          } as SettledTransaction,
          {
            transaction_id: 'TXN007',
            status: 'rejected',
            reasons: ['INVALID_AMOUNT'],
          } as RejectedTransaction,
        ],
      };

      const table = formatSummaryTable(stats);
      expect(table).toContain('SETTLED');
      expect(table).toContain('REJECTED');
      expect(table).toContain('Settled=1');
      expect(table).toContain('Rejected=1');
    });

    it('should handle empty results', () => {
      const stats: PipelineStats = {
        total: 0,
        validated: 0,
        rejected: 0,
        settled: 0,
        lowRisk: 0,
        mediumRisk: 0,
        highRisk: 0,
        results: [],
      };

      const table = formatSummaryTable(stats);
      expect(table).toContain('Processed=0');
    });
  });
});
