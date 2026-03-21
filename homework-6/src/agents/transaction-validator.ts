import { RawTransaction, RawTransactionSchema, REQUIRED_FIELDS, ValidationResult } from '../types/transaction';
import { TransactionMessage } from '../types/message';
import { isValidCurrency } from '../utils/currencies';
import { parseDecimal, isPositive } from '../utils/decimal';
import { createLogger } from '../utils/logger';

const logger = createLogger('transaction_validator');

/**
 * Validate a raw transaction
 * Checks: required fields, positive amount (Decimal.js), valid currency
 * Never throws - returns rejected result on validation failure
 * @param transaction Raw transaction to validate
 * @returns ValidationResult with status and reasons
 */
export function validateTransaction(transaction: any): ValidationResult {
  const reasons: string[] = [];

  // Step 1: Check required fields in order
  for (const field of REQUIRED_FIELDS) {
    if (!(field in transaction) || transaction[field] === null || transaction[field] === undefined) {
      reasons.push(`MISSING_FIELD:${field}`);
      // Report only the first missing field
      break;
    }
  }

  // Step 2: Validate amount (must be positive Decimal) — only if field is present
  if (transaction.amount !== null && transaction.amount !== undefined) {
    try {
      const amount = parseDecimal(transaction.amount);
      if (!isPositive(amount)) {
        reasons.push('INVALID_AMOUNT');
      }
    } catch (error) {
      reasons.push('INVALID_AMOUNT');
    }
  }

  // Step 3: Validate currency — only if field is present
  if (transaction.currency !== null && transaction.currency !== undefined) {
    if (!isValidCurrency(transaction.currency)) {
      reasons.push('INVALID_CURRENCY');
    }
  }

  // If any validation failed, reject
  if (reasons.length > 0) {
    logger.warn('Transaction validation failed', {
      transaction_id: transaction.transaction_id || 'UNKNOWN',
      reasons: reasons.join(', '),
    });

    return {
      transaction_id: transaction.transaction_id || 'UNKNOWN',
      status: 'rejected',
      reasons,
      transaction,
    };
  }

  // All validations passed
  logger.info('Transaction validated', {
    transaction_id: transaction.transaction_id,
    amount: transaction.amount,
    currency: transaction.currency,
  });

  // Return validated transaction (cast to validated type)
  return {
    ...transaction,
    status: 'validated',
  } as any;
}

/**
 * Parse a raw transaction via Zod schema safely
 * Returns parsed transaction or validation errors
 * @param data Raw data to parse
 * @returns Parsed transaction or error details
 */
export function parseRawTransaction(data: any) {
  const result = RawTransactionSchema.safeParse(data);

  if (!result.success) {
    const errorMessages = result.error.errors.map((err) => {
      const path = err.path.join('.');
      return `${path}: ${err.message}`;
    });

    return {
      success: false,
      errors: errorMessages,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Main processor function for transaction validation
 * Accepts a TransactionMessage envelope and extracts the transaction for validation
 * @param message Message envelope containing the raw transaction
 * @returns ValidationResult
 */
export function processMessage(message: TransactionMessage): ValidationResult {
  const transaction = message.data.transaction;
  return validateTransaction(transaction);
}

/**
 * Export utilities for testing
 */
export { maskAccountNumber } from '../utils/logger';
export { VALID_CURRENCIES, isValidCurrency } from '../utils/currencies';
export { parseDecimal, isPositive } from '../utils/decimal';
