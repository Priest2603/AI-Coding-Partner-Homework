import { FraudScoredTransaction, SettledTransaction } from '../types/transaction';
import { EXCHANGE_RATES, CurrencyCode } from '../utils/currencies';
import {
  Decimal,
  parseDecimal,
  formatMoney,
  multiplyDecimals,
  calculatePercentage,
  subtractMoney,
  addMoney,
} from '../utils/decimal';
import { createLogger } from '../utils/logger';

const logger = createLogger('settlement_processor');

/**
 * Determine if a transaction is cross-border
 * @param country Source country
 * @returns true if cross-border
 */
function isCrossBorder(country?: string): boolean {
  return country !== 'US';
}

/**
 * Calculate fees for a transaction
 * @param convertedAmount Amount after currency conversion
 * @param isCrossBorderTx Is this a cross-border transaction
 * @param isWireTransfer Is this a wire transfer
 * @returns Object with fee breakdown
 */
export function calculateFees(
  convertedAmount: Decimal,
  isCrossBorderTx: boolean,
  isWireTransfer: boolean
): {
  fee_percentage: string;
  fee_amount: string;
  wire_surcharge: string;
  total_fees: string;
} {
  // Determine fee rate (0.1% domestic or 0.5% cross-border)
  const feeRate = isCrossBorderTx ? new Decimal('0.005') : new Decimal('0.001');

  // Calculate percentage fee
  const feeAmount = calculatePercentage(convertedAmount, feeRate);

  // Calculate wire surcharge if applicable
  const wireSurcharge = isWireTransfer ? new Decimal('25.00') : new Decimal('0');

  // Total fees = percentage fee + wire surcharge
  const totalFees = addMoney(feeAmount, wireSurcharge);

  return {
    fee_percentage: formatMoney(feeRate.mul(100)),
    fee_amount: formatMoney(feeAmount),
    wire_surcharge: formatMoney(wireSurcharge),
    total_fees: formatMoney(totalFees),
  };
}

/**
 * Main processor function for settlement
 * Converts currency, calculates fees, and produces settled amount
 * @param transaction Fraud-scored transaction
 * @returns Transaction enriched with settlement information
 */
export function processMessage(transaction: FraudScoredTransaction): SettledTransaction {
  const originalAmount = parseDecimal(transaction.amount);
  const exchangeRate = new Decimal(EXCHANGE_RATES[transaction.currency as CurrencyCode]);

  // Step 1: Convert to USD
  const convertedAmount = multiplyDecimals(originalAmount, exchangeRate);

  // Step 2: Determine transaction type flags
  const isWireTransfer = transaction.transaction_type === 'wire_transfer';
  const country = transaction.metadata?.country;
  const isCrossBorderTx = isCrossBorder(country);

  // Step 3: Calculate fees
  const feeBreakdown = calculateFees(convertedAmount, isCrossBorderTx, isWireTransfer);
  const totalFees = parseDecimal(feeBreakdown.total_fees);

  // Step 4: Calculate settled amount
  const settledAmount = subtractMoney(convertedAmount, totalFees);

  // Log settlement
  logger.info('Settlement processed', {
    transaction_id: transaction.transaction_id,
    original_amount: transaction.amount,
    original_currency: transaction.currency,
    converted_amount: formatMoney(convertedAmount),
    fee_breakdown: {
      percentage: feeBreakdown.fee_percentage,
      amount: feeBreakdown.fee_amount,
      wire_surcharge: feeBreakdown.wire_surcharge,
      total: feeBreakdown.total_fees,
    },
    settled_amount: formatMoney(settledAmount),
  });

  // Return complete settlement record
  return {
    ...transaction,
    converted_amount: formatMoney(convertedAmount),
    original_currency: transaction.currency,
    settlement_currency: 'USD',
    fee_percentage: feeBreakdown.fee_percentage,
    fee_amount: feeBreakdown.fee_amount,
    wire_surcharge: feeBreakdown.wire_surcharge,
    total_fees: feeBreakdown.total_fees,
    settled_amount: formatMoney(settledAmount),
    settled_at: new Date().toISOString(),
  };
}

/**
 * Export utilities for testing
 */
export { EXCHANGE_RATES } from '../utils/currencies';
export { Decimal, parseDecimal, formatMoney } from '../utils/decimal';
