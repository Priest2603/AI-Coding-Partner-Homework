process.env.NODE_ENV = 'test';

import { calculateFraudScore, convertToUSD, processMessage, EXCHANGE_RATES, parseDecimal as fdParseDecimal } from '../../src/agents/fraud-detector';
import { ValidatedTransaction } from '../../src/types/transaction';
import { Decimal } from '../../src/utils/decimal';

/**
 * Helper: build a valid validated transaction for fraud scoring
 */
function buildValidatedTxn(overrides: Partial<ValidatedTransaction> = {}): ValidatedTransaction {
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
    status: 'validated',
    ...overrides,
  };
}

describe('Fraud Detector', () => {
  describe('convertToUSD', () => {
    it('should return same amount for USD', () => {
      const result = convertToUSD(new Decimal('1000'), 'USD');
      expect(result.toNumber()).toBe(1000);
    });

    it('should convert EUR to USD', () => {
      const result = convertToUSD(new Decimal('1000'), 'EUR');
      expect(result.toNumber()).toBe(1080); // 1000 * 1.08
    });

    it('should convert GBP to USD', () => {
      const result = convertToUSD(new Decimal('1000'), 'GBP');
      expect(result.toNumber()).toBe(1270); // 1000 * 1.27
    });

    it('should convert JPY to USD', () => {
      const result = convertToUSD(new Decimal('100000'), 'JPY');
      expect(result.toNumber()).toBe(670); // 100000 * 0.0067
    });
  });

  describe('calculateFraudScore', () => {
    // --- LOW risk (score <= 2) ---
    it('should return LOW risk for small domestic USD transaction', () => {
      const txn = buildValidatedTxn({ amount: '1500.00', currency: 'USD' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_risk_level).toBe('LOW');
      expect(result.fraud_risk_score).toBe(0);
      expect(result.fraud_triggers).toHaveLength(0);
    });

    // --- Boundary: exactly $10,000 (should NOT trigger) ---
    it('should NOT trigger amount_above_10000 at exactly $10,000 USD', () => {
      const txn = buildValidatedTxn({ amount: '10000.00', currency: 'USD' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).not.toContain('amount_above_10000');
    });

    // --- Boundary: $10,000.01 (should trigger) ---
    it('should trigger amount_above_10000 at $10,000.01 USD', () => {
      const txn = buildValidatedTxn({ amount: '10000.01', currency: 'USD' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('amount_above_10000');
      expect(result.fraud_risk_score).toBe(3);
    });

    // --- Boundary: exactly $50,000 (should NOT trigger amount_above_50000) ---
    it('should NOT trigger amount_above_50000 at exactly $50,000 USD', () => {
      const txn = buildValidatedTxn({ amount: '50000.00', currency: 'USD' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('amount_above_10000');
      expect(result.fraud_triggers).not.toContain('amount_above_50000');
    });

    // --- Boundary: $50,000.01 (should trigger both) ---
    it('should trigger both amount triggers at $50,000.01 USD', () => {
      const txn = buildValidatedTxn({ amount: '50000.01', currency: 'USD' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('amount_above_10000');
      expect(result.fraud_triggers).toContain('amount_above_50000');
      expect(result.fraud_risk_score).toBe(7); // 3 + 4
    });

    // --- Cross-border trigger ---
    it('should trigger cross_border for non-US country', () => {
      const txn = buildValidatedTxn({
        metadata: { channel: 'online', country: 'DE' },
      });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('cross_border');
      expect(result.fraud_risk_score).toBe(1);
    });

    it('should NOT trigger cross_border for US country', () => {
      const txn = buildValidatedTxn({
        metadata: { channel: 'online', country: 'US' },
      });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).not.toContain('cross_border');
    });

    it('should trigger cross_border when country is undefined', () => {
      const txn = buildValidatedTxn({ metadata: { channel: 'online' } });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('cross_border');
    });

    it('should trigger cross_border when metadata is undefined', () => {
      const txn = buildValidatedTxn();
      delete (txn as any).metadata;
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('cross_border');
    });

    // --- Unusual hour trigger (02:00-04:59 UTC) ---
    it('should trigger unusual_hour at 02:00 UTC', () => {
      const txn = buildValidatedTxn({ timestamp: '2026-03-16T02:00:00Z' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('unusual_hour');
    });

    it('should trigger unusual_hour at 04:59 UTC', () => {
      const txn = buildValidatedTxn({ timestamp: '2026-03-16T04:59:00Z' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('unusual_hour');
    });

    it('should NOT trigger unusual_hour at 01:59 UTC', () => {
      const txn = buildValidatedTxn({ timestamp: '2026-03-16T01:59:00Z' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).not.toContain('unusual_hour');
    });

    it('should NOT trigger unusual_hour at 05:00 UTC', () => {
      const txn = buildValidatedTxn({ timestamp: '2026-03-16T05:00:00Z' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).not.toContain('unusual_hour');
    });

    it('should NOT trigger unusual_hour at 10:00 UTC (daytime)', () => {
      const txn = buildValidatedTxn({ timestamp: '2026-03-16T10:00:00Z' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).not.toContain('unusual_hour');
    });

    // --- Risk levels ---
    it('should return LOW risk for score 0', () => {
      const txn = buildValidatedTxn({ amount: '100.00' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_risk_level).toBe('LOW');
    });

    it('should return LOW risk for score 2', () => {
      // unusual_hour = 2 pts
      const txn = buildValidatedTxn({
        amount: '100.00',
        timestamp: '2026-03-16T03:00:00Z',
      });
      const result = calculateFraudScore(txn);
      expect(result.fraud_risk_score).toBe(2);
      expect(result.fraud_risk_level).toBe('LOW');
    });

    it('should return MEDIUM risk for score 3', () => {
      // amount_above_10000 = 3 pts
      const txn = buildValidatedTxn({ amount: '15000.00' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_risk_score).toBe(3);
      expect(result.fraud_risk_level).toBe('MEDIUM');
    });

    it('should return MEDIUM risk for score 6', () => {
      // amount_above_10000 (3) + unusual_hour (2) + cross_border (1) = 6
      const txn = buildValidatedTxn({
        amount: '15000.00',
        timestamp: '2026-03-16T03:00:00Z',
        metadata: { channel: 'online', country: 'DE' },
      });
      const result = calculateFraudScore(txn);
      expect(result.fraud_risk_score).toBe(6);
      expect(result.fraud_risk_level).toBe('MEDIUM');
    });

    it('should return HIGH risk for score 7+', () => {
      // amount_above_10000 (3) + amount_above_50000 (4) = 7
      const txn = buildValidatedTxn({ amount: '75000.00' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_risk_score).toBe(7);
      expect(result.fraud_risk_level).toBe('HIGH');
    });

    // --- Score cap at 10 ---
    it('should cap fraud score at 10', () => {
      // amount_above_10000 (3) + amount_above_50000 (4) + unusual_hour (2) + cross_border (1) = 10
      const txn = buildValidatedTxn({
        amount: '75000.00',
        timestamp: '2026-03-16T03:00:00Z',
        metadata: { channel: 'online', country: 'DE' },
      });
      const result = calculateFraudScore(txn);
      expect(result.fraud_risk_score).toBe(10);
      expect(result.fraud_risk_level).toBe('HIGH');
    });

    // --- Currency conversion in fraud scoring ---
    it('should convert EUR to USD for threshold comparison (below threshold)', () => {
      // EUR 9259 * 1.08 = $9,999.72 (below $10,000)
      const txn = buildValidatedTxn({ amount: '9259.00', currency: 'EUR' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).not.toContain('amount_above_10000');
    });

    it('should flag EUR amount that exceeds $10,000 after conversion', () => {
      // EUR 9260 * 1.08 = $10,000.80 (above $10,000)
      const txn = buildValidatedTxn({ amount: '9260.00', currency: 'EUR' });
      const result = calculateFraudScore(txn);
      expect(result.fraud_triggers).toContain('amount_above_10000');
    });
  });

  describe('processMessage', () => {
    it('should return a FraudScoredTransaction with all original fields preserved', () => {
      const txn = buildValidatedTxn();
      const result = processMessage(txn);

      // Original fields preserved
      expect(result.transaction_id).toBe('TXN-TEST');
      expect(result.amount).toBe('1500.00');
      expect(result.currency).toBe('USD');
      expect(result.status).toBe('validated');

      // Fraud fields added
      expect(result.fraud_risk_score).toBeDefined();
      expect(result.fraud_risk_level).toBeDefined();
      expect(result.fraud_triggers).toBeDefined();
      expect(Array.isArray(result.fraud_triggers)).toBe(true);
    });

    it('should score LOW risk for small domestic transaction', () => {
      const txn = buildValidatedTxn({ amount: '500.00' });
      const result = processMessage(txn);
      expect(result.fraud_risk_level).toBe('LOW');
      expect(result.fraud_risk_score).toBe(0);
    });

    it('should score HIGH risk for large transaction', () => {
      const txn = buildValidatedTxn({ amount: '75000.00' });
      const result = processMessage(txn);
      expect(result.fraud_risk_level).toBe('HIGH');
    });
  });

  describe('re-exported utilities', () => {
    it('should re-export EXCHANGE_RATES', () => {
      expect(EXCHANGE_RATES.USD).toBe('1.00');
      expect(EXCHANGE_RATES.EUR).toBe('1.08');
    });

    it('should re-export parseDecimal', () => {
      const d = fdParseDecimal('42');
      expect(d.toNumber()).toBe(42);
    });
  });
});
