process.env.NODE_ENV = 'test';

import { v4 as uuidv4 } from 'uuid';
import {
  validateTransaction,
  parseRawTransaction,
  processMessage,
  maskAccountNumber,
  VALID_CURRENCIES,
  isValidCurrency,
  parseDecimal,
  isPositive,
} from '../../src/agents/transaction-validator';
import { TransactionMessage } from '../../src/types/message';
import { RawTransaction } from '../../src/types/transaction';

/**
 * Helper: build a valid raw transaction (all fields present, positive amount, valid currency)
 */
function buildValidTransaction(overrides: Partial<RawTransaction> = {}): RawTransaction {
  return {
    transaction_id: 'TXN-TEST',
    timestamp: '2026-03-16T10:00:00Z',
    source_account: 'ACC-1001',
    destination_account: 'ACC-2001',
    amount: '1500.00',
    currency: 'USD',
    transaction_type: 'transfer',
    description: 'Test payment',
    metadata: { channel: 'online', country: 'US' },
    ...overrides,
  };
}

/**
 * Helper: wrap a transaction in a TransactionMessage envelope
 */
function buildTransactionMessage(transaction: RawTransaction): TransactionMessage {
  return {
    message_id: uuidv4(),
    timestamp: new Date().toISOString(),
    source_agent: 'integrator',
    target_agent: 'transaction_validator',
    message_type: 'transaction',
    data: { transaction },
  };
}

describe('Transaction Validator', () => {
  describe('validateTransaction', () => {
    // --- Happy Path ---
    it('should validate a correct transaction', () => {
      const txn = buildValidTransaction();
      const result = validateTransaction(txn);
      expect(result.status).toBe('validated');
      expect(result.transaction_id).toBe('TXN-TEST');
    });

    it('should preserve all original fields on validated transaction', () => {
      const txn = buildValidTransaction();
      const result = validateTransaction(txn);
      expect(result).toMatchObject({
        transaction_id: 'TXN-TEST',
        amount: '1500.00',
        currency: 'USD',
        transaction_type: 'transfer',
        status: 'validated',
      });
    });

    // --- Missing Fields ---
    it('should reject when transaction_id is missing', () => {
      const txn = buildValidTransaction();
      delete (txn as any).transaction_id;
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:transaction_id');
    });

    it('should reject when timestamp is missing', () => {
      const txn = buildValidTransaction();
      delete (txn as any).timestamp;
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:timestamp');
    });

    it('should reject when source_account is missing', () => {
      const txn = buildValidTransaction();
      delete (txn as any).source_account;
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:source_account');
    });

    it('should reject when destination_account is missing', () => {
      const txn = buildValidTransaction();
      delete (txn as any).destination_account;
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:destination_account');
    });

    it('should reject when amount is missing', () => {
      const txn = buildValidTransaction();
      delete (txn as any).amount;
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:amount');
    });

    it('should reject when currency is missing', () => {
      const txn = buildValidTransaction();
      delete (txn as any).currency;
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:currency');
    });

    it('should reject when transaction_type is missing', () => {
      const txn = buildValidTransaction();
      delete (txn as any).transaction_type;
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:transaction_type');
    });

    it('should report only the first missing field', () => {
      const result = validateTransaction({} as any);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toHaveLength(1);
      expect((result as any).reasons[0]).toBe('MISSING_FIELD:transaction_id');
    });

    it('should reject when a required field is null', () => {
      const txn = buildValidTransaction({ amount: null as any });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:amount');
    });

    it('should reject when a required field is undefined', () => {
      const txn = buildValidTransaction({ currency: undefined as any });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('MISSING_FIELD:currency');
    });

    // --- Invalid Amount ---
    it('should reject negative amount', () => {
      const txn = buildValidTransaction({ amount: '-100.00' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('INVALID_AMOUNT');
    });

    it('should reject zero amount', () => {
      const txn = buildValidTransaction({ amount: '0' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('INVALID_AMOUNT');
    });

    it('should reject non-numeric amount', () => {
      const txn = buildValidTransaction({ amount: 'abc' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('INVALID_AMOUNT');
    });

    it('should accept very small positive amount', () => {
      const txn = buildValidTransaction({ amount: '0.01' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('validated');
    });

    // --- Invalid Currency ---
    it('should reject invalid currency code', () => {
      const txn = buildValidTransaction({ currency: 'XYZ' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('INVALID_CURRENCY');
    });

    it('should reject lowercase currency code', () => {
      const txn = buildValidTransaction({ currency: 'usd' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('INVALID_CURRENCY');
    });

    // --- Multiple Rejection Reasons ---
    it('should collect both INVALID_AMOUNT and INVALID_CURRENCY', () => {
      const txn = buildValidTransaction({ amount: '-50', currency: 'XYZ' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).reasons).toContain('INVALID_AMOUNT');
      expect((result as any).reasons).toContain('INVALID_CURRENCY');
      expect((result as any).reasons).toHaveLength(2);
    });

    // --- Rejection includes original transaction ---
    it('should include original transaction data in rejected result', () => {
      const txn = buildValidTransaction({ amount: '-50' });
      const result = validateTransaction(txn);
      expect(result.status).toBe('rejected');
      expect((result as any).transaction).toBeDefined();
      expect((result as any).transaction.transaction_id).toBe('TXN-TEST');
    });

    // --- Valid currencies ---
    it('should accept all valid currencies', () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
      for (const currency of currencies) {
        const txn = buildValidTransaction({ currency });
        const result = validateTransaction(txn);
        expect(result.status).toBe('validated');
      }
    });
  });

  describe('parseRawTransaction', () => {
    it('should parse a valid raw transaction', () => {
      const txn = buildValidTransaction();
      const result = parseRawTransaction(txn);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.transaction_id).toBe('TXN-TEST');
    });

    it('should fail for missing required fields', () => {
      const result = parseRawTransaction({});
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should fail for invalid timestamp format', () => {
      const txn = buildValidTransaction({ timestamp: 'not-a-date' });
      const result = parseRawTransaction(txn);
      expect(result.success).toBe(false);
    });

    it('should accept transaction without optional fields', () => {
      const txn = {
        transaction_id: 'TXN-001',
        timestamp: '2026-03-16T10:00:00Z',
        source_account: 'ACC-1001',
        destination_account: 'ACC-2001',
        amount: '100.00',
        currency: 'USD',
        transaction_type: 'transfer',
      };
      const result = parseRawTransaction(txn);
      expect(result.success).toBe(true);
    });
  });

  describe('processMessage', () => {
    it('should extract transaction from envelope and validate', () => {
      const txn = buildValidTransaction();
      const msg = buildTransactionMessage(txn);
      const result = processMessage(msg);
      expect(result.status).toBe('validated');
      expect(result.transaction_id).toBe('TXN-TEST');
    });

    it('should reject invalid transaction via envelope', () => {
      const txn = buildValidTransaction({ amount: '-100' });
      const msg = buildTransactionMessage(txn);
      const result = processMessage(msg);
      expect(result.status).toBe('rejected');
    });
  });

  describe('re-exported utilities', () => {
    it('should re-export maskAccountNumber', () => {
      expect(maskAccountNumber('ACC-1001')).toBe('ACC-****');
    });

    it('should re-export VALID_CURRENCIES', () => {
      expect(VALID_CURRENCIES).toContain('USD');
    });

    it('should re-export isValidCurrency', () => {
      expect(isValidCurrency('USD')).toBe(true);
      expect(isValidCurrency('XYZ')).toBe(false);
    });

    it('should re-export parseDecimal', () => {
      const d = parseDecimal('100');
      expect(d.toNumber()).toBe(100);
    });

    it('should re-export isPositive', () => {
      expect(isPositive(parseDecimal('1'))).toBe(true);
      expect(isPositive(parseDecimal('-1'))).toBe(false);
    });
  });
});
