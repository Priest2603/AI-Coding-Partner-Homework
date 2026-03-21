import { ValidatedTransaction, FraudScoredTransaction } from '../types/transaction';
import { EXCHANGE_RATES, CurrencyCode } from '../utils/currencies';
import { Decimal, parseDecimal, formatMoney, multiplyDecimals } from '../utils/decimal';
import { createLogger } from '../utils/logger';

const logger = createLogger('fraud_detector');

/**
 * Fraud scoring triggers and their point values
 */
const FRAUD_TRIGGERS = {
  amount_above_10000: { points: 3, description: 'Amount above $10,000' },
  amount_above_50000: { points: 4, description: 'Amount above $50,000' },
  unusual_hour: { points: 2, description: 'Transaction during unusual hours (02:00-04:59 UTC)' },
  cross_border: { points: 1, description: 'Cross-border transaction' },
};

const MAX_FRAUD_SCORE = 10;

/**
 * Convert an amount from any currency to USD
 * @param amount Amount as Decimal
 * @param currency Currency code
 * @returns Amount in USD as Decimal
 */
export function convertToUSD(amount: Decimal, currency: CurrencyCode): Decimal {
  const rate = new Decimal(EXCHANGE_RATES[currency]);
  return multiplyDecimals(amount, rate);
}

/**
 * Extract UTC hour from ISO 8601 timestamp
 * @param timestamp ISO 8601 timestamp string
 * @returns UTC hour (0-23)
 */
function getUTCHour(timestamp: string): number {
  const date = new Date(timestamp);
  return date.getUTCHours();
}

/**
 * Determine if a transaction occurs during unusual hours (02:00-04:59 UTC)
 * @param hour UTC hour (0-23)
 * @returns true if unusual hour
 */
function isUnusualHour(hour: number): boolean {
  return hour >= 2 && hour <= 4;
}

/**
 * Determine if a transaction is cross-border (non-US)
 * @param country Source country code
 * @returns true if cross-border
 */
function isCrossBorder(country?: string): boolean {
  return country !== 'US';
}

/**
 * Calculate fraud risk score for a transaction
 * Cumulative scoring from 0-10 based on multiple triggers
 * @param transaction Validated transaction
 * @returns Object with score, level, and triggers
 */
export function calculateFraudScore(transaction: ValidatedTransaction): {
  fraud_risk_score: number;
  fraud_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  fraud_triggers: string[];
} {
  let score = 0;
  const triggers: string[] = [];

  // Convert amount to USD for comparison
  const amountDecimal = parseDecimal(transaction.amount);
  const amountInUSD = convertToUSD(amountDecimal, transaction.currency as CurrencyCode);

  // Trigger 1: Amount > $10,000
  const tenKThreshold = new Decimal('10000');
  if (amountInUSD.greaterThan(tenKThreshold)) {
    score += FRAUD_TRIGGERS.amount_above_10000.points;
    triggers.push('amount_above_10000');
  }

  // Trigger 2: Amount > $50,000 (additional points)
  const fiftyKThreshold = new Decimal('50000');
  if (amountInUSD.greaterThan(fiftyKThreshold)) {
    score += FRAUD_TRIGGERS.amount_above_50000.points;
    triggers.push('amount_above_50000');
  }

  // Trigger 3: Unusual hour (02:00-04:59 UTC)
  const hour = getUTCHour(transaction.timestamp);
  if (isUnusualHour(hour)) {
    score += FRAUD_TRIGGERS.unusual_hour.points;
    triggers.push('unusual_hour');
  }

  // Trigger 4: Cross-border transaction
  const country = transaction.metadata?.country;
  if (isCrossBorder(country)) {
    score += FRAUD_TRIGGERS.cross_border.points;
    triggers.push('cross_border');
  }

  // Cap score at 10
  score = Math.min(score, MAX_FRAUD_SCORE);

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  if (score <= 2) {
    riskLevel = 'LOW';
  } else if (score <= 6) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  return {
    fraud_risk_score: score,
    fraud_risk_level: riskLevel,
    fraud_triggers: triggers,
  };
}

/**
 * Main processor function for fraud detection
 * Scores a validated transaction for fraud risk
 * @param transaction Validated transaction
 * @returns Transaction enriched with fraud scoring
 */
export function processMessage(transaction: ValidatedTransaction): FraudScoredTransaction {
  const fraudAnalysis = calculateFraudScore(transaction);

  // Log the result
  if (fraudAnalysis.fraud_risk_level === 'LOW') {
    logger.info('Fraud analysis complete', {
      transaction_id: transaction.transaction_id,
      fraud_risk_score: fraudAnalysis.fraud_risk_score,
      fraud_risk_level: fraudAnalysis.fraud_risk_level,
      triggers: fraudAnalysis.fraud_triggers.join(', '),
    });
  } else {
    logger.warn('Fraud analysis complete', {
      transaction_id: transaction.transaction_id,
      fraud_risk_score: fraudAnalysis.fraud_risk_score,
      fraud_risk_level: fraudAnalysis.fraud_risk_level,
      triggers: fraudAnalysis.fraud_triggers.join(', '),
    });
  }

  return {
    ...transaction,
    ...fraudAnalysis,
  };
}

/**
 * Export utilities for testing
 */
export { EXCHANGE_RATES } from '../utils/currencies';
export { Decimal, parseDecimal } from '../utils/decimal';
