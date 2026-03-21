process.env.NODE_ENV = 'test';

import { calculateFees, processMessage, EXCHANGE_RATES as spExchangeRates, parseDecimal as spParseDecimal, formatMoney as spFormatMoney } from '../../src/agents/settlement-processor';
import { FraudScoredTransaction } from '../../src/types/transaction';
import { Decimal } from '../../src/utils/decimal';

/**
 * Helper: build a fraud-scored transaction for settlement testing
 */
function buildFraudScoredTxn(
  overrides: Partial<FraudScoredTransaction> = {}
): FraudScoredTransaction {
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
    fraud_risk_score: 0,
    fraud_risk_level: 'LOW',
    fraud_triggers: [],
    ...overrides,
  };
}

describe('Settlement Processor', () => {
  describe('calculateFees', () => {
    it('should calculate domestic non-wire fees (0.1%)', () => {
      const amount = new Decimal('10000');
      const result = calculateFees(amount, false, false);
      expect(result.fee_percentage).toBe('0.10');
      expect(result.fee_amount).toBe('10.00');
      expect(result.wire_surcharge).toBe('0.00');
      expect(result.total_fees).toBe('10.00');
    });

    it('should calculate cross-border non-wire fees (0.5%)', () => {
      const amount = new Decimal('10000');
      const result = calculateFees(amount, true, false);
      expect(result.fee_percentage).toBe('0.50');
      expect(result.fee_amount).toBe('50.00');
      expect(result.wire_surcharge).toBe('0.00');
      expect(result.total_fees).toBe('50.00');
    });

    it('should add $25 wire surcharge for wire transfers', () => {
      const amount = new Decimal('10000');
      const result = calculateFees(amount, false, true);
      expect(result.fee_percentage).toBe('0.10');
      expect(result.fee_amount).toBe('10.00');
      expect(result.wire_surcharge).toBe('25.00');
      expect(result.total_fees).toBe('35.00');
    });

    it('should calculate cross-border wire transfer fees', () => {
      const amount = new Decimal('10000');
      const result = calculateFees(amount, true, true);
      expect(result.fee_percentage).toBe('0.50');
      expect(result.fee_amount).toBe('50.00');
      expect(result.wire_surcharge).toBe('25.00');
      expect(result.total_fees).toBe('75.00');
    });

    it('should handle very small amounts', () => {
      const amount = new Decimal('1.00');
      const result = calculateFees(amount, false, false);
      expect(result.fee_amount).toBe('0.00'); // 0.1% of $1 = $0.001 rounds to 0.00
      expect(result.total_fees).toBe('0.00');
    });

    it('should handle large amounts', () => {
      const amount = new Decimal('75000');
      const result = calculateFees(amount, false, false);
      expect(result.fee_amount).toBe('75.00'); // 0.1% of $75,000
      expect(result.total_fees).toBe('75.00');
    });
  });

  describe('processMessage', () => {
    it('should settle a domestic USD transfer correctly', () => {
      const txn = buildFraudScoredTxn({
        amount: '1500.00',
        currency: 'USD',
        transaction_type: 'transfer',
        metadata: { channel: 'online', country: 'US' },
      });
      const result = processMessage(txn);

      expect(result.transaction_id).toBe('TXN-TEST');
      expect(result.original_currency).toBe('USD');
      expect(result.settlement_currency).toBe('USD');
      expect(result.converted_amount).toBe('1500.00'); // USD * 1.00
      expect(result.fee_percentage).toBe('0.10');       // domestic
      expect(result.fee_amount).toBe('1.50');            // 0.1% of 1500
      expect(result.wire_surcharge).toBe('0.00');
      expect(result.total_fees).toBe('1.50');
      expect(result.settled_amount).toBe('1498.50');     // 1500 - 1.50
      expect(result.settled_at).toBeDefined();
    });

    it('should settle a EUR cross-border transfer correctly', () => {
      const txn = buildFraudScoredTxn({
        amount: '500.00',
        currency: 'EUR',
        transaction_type: 'transfer',
        metadata: { channel: 'api', country: 'DE' },
      });
      const result = processMessage(txn);

      expect(result.original_currency).toBe('EUR');
      expect(result.settlement_currency).toBe('USD');
      expect(result.converted_amount).toBe('540.00');    // 500 * 1.08
      expect(result.fee_percentage).toBe('0.50');         // cross-border
      expect(result.fee_amount).toBe('2.70');             // 0.5% of 540
      expect(result.wire_surcharge).toBe('0.00');
      expect(result.total_fees).toBe('2.70');
      expect(result.settled_amount).toBe('537.30');       // 540 - 2.70
    });

    it('should add wire surcharge for wire_transfer type', () => {
      const txn = buildFraudScoredTxn({
        amount: '25000.00',
        currency: 'USD',
        transaction_type: 'wire_transfer',
        metadata: { channel: 'branch', country: 'US' },
      });
      const result = processMessage(txn);

      expect(result.fee_percentage).toBe('0.10');
      expect(result.fee_amount).toBe('25.00');           // 0.1% of 25000
      expect(result.wire_surcharge).toBe('25.00');
      expect(result.total_fees).toBe('50.00');           // 25 + 25
      expect(result.settled_amount).toBe('24950.00');    // 25000 - 50
    });

    it('should preserve all original and fraud scoring fields', () => {
      const txn = buildFraudScoredTxn({
        fraud_risk_score: 3,
        fraud_risk_level: 'MEDIUM',
        fraud_triggers: ['amount_above_10000'],
      });
      const result = processMessage(txn);

      // Original fields
      expect(result.transaction_id).toBe('TXN-TEST');
      expect(result.source_account).toBe('ACC-1001');
      expect(result.status).toBe('validated');

      // Fraud fields
      expect(result.fraud_risk_score).toBe(3);
      expect(result.fraud_risk_level).toBe('MEDIUM');
      expect(result.fraud_triggers).toContain('amount_above_10000');

      // Settlement fields
      expect(result.settled_amount).toBeDefined();
      expect(result.settled_at).toBeDefined();
    });

    it('should produce a valid ISO 8601 settled_at timestamp', () => {
      const txn = buildFraudScoredTxn();
      const result = processMessage(txn);
      const date = new Date(result.settled_at);
      expect(date.toISOString()).toBe(result.settled_at);
    });

    it('should handle GBP currency conversion', () => {
      const txn = buildFraudScoredTxn({
        amount: '1000.00',
        currency: 'GBP',
        metadata: { channel: 'online', country: 'GB' },
      });
      const result = processMessage(txn);
      expect(result.converted_amount).toBe('1270.00'); // 1000 * 1.27
    });

    it('should handle JPY currency with very small exchange rate', () => {
      const txn = buildFraudScoredTxn({
        amount: '100000',
        currency: 'JPY',
        metadata: { channel: 'online', country: 'JP' },
      });
      const result = processMessage(txn);
      expect(result.converted_amount).toBe('670.00'); // 100000 * 0.0067
    });

    it('should treat undefined country as cross-border', () => {
      const txn = buildFraudScoredTxn({
        amount: '1000.00',
        currency: 'USD',
      });
      delete (txn as any).metadata;
      const result = processMessage(txn);
      // Cross-border fee: 0.5%
      expect(result.fee_percentage).toBe('0.50');
    });
  });

  describe('re-exported utilities', () => {
    it('should re-export EXCHANGE_RATES', () => {
      expect(spExchangeRates.USD).toBe('1.00');
    });

    it('should re-export parseDecimal', () => {
      expect(spParseDecimal('100').toNumber()).toBe(100);
    });

    it('should re-export formatMoney', () => {
      expect(spFormatMoney(spParseDecimal('100.5'))).toBe('100.50');
    });
  });
});
