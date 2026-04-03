import Decimal from 'decimal.js';

/**
 * Configure Decimal.js for monetary calculations
 * - 20 significant digits (handles very large amounts)
 * - ROUND_HALF_UP rounding mode (standard for financial calculations)
 */
Decimal.set({
  maxE: 20,
  minE: -20,
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Re-export Decimal for use throughout the pipeline
 */
export { Decimal };

/**
 * Parse a string or number into a Decimal
 * Throws if the value is not a valid number
 * @param value String or number to parse
 * @returns Decimal instance
 */
export function parseDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

/**
 * Check if a Decimal value is positive (> 0)
 * @param value Decimal to check
 * @returns true if positive, false otherwise
 */
export function isPositive(value: Decimal): boolean {
  return value.greaterThan(0);
}

/**
 * Format a Decimal to 2 decimal places (monetary standard)
 * @param value Decimal to format
 * @returns Formatted string (e.g., "1234.56")
 */
export function formatMoney(value: Decimal): string {
  return value.toFixed(2);
}

/**
 * Calculate percentage of an amount
 * @param amount Base amount (Decimal)
 * @param percentage Percentage as decimal (e.g., 0.001 for 0.1%)
 * @returns Percentage of amount as Decimal
 */
export function calculatePercentage(amount: Decimal, percentage: string | Decimal): Decimal {
  const percentValue = typeof percentage === 'string' ? new Decimal(percentage) : percentage;
  return amount.mul(percentValue);
}

/**
 * Add two monetary amounts
 * @param a First amount (Decimal)
 * @param b Second amount (Decimal)
 * @returns Sum as Decimal
 */
export function addMoney(a: Decimal, b: Decimal): Decimal {
  return a.plus(b);
}

/**
 * Subtract two monetary amounts
 * @param a First amount (Decimal)
 * @param b Amount to subtract (Decimal)
 * @returns Difference as Decimal
 */
export function subtractMoney(a: Decimal, b: Decimal): Decimal {
  return a.minus(b);
}

/**
 * Multiply two decimal values (e.g., amount * exchange rate)
 * @param a First value (Decimal)
 * @param b Second value (Decimal)
 * @returns Product as Decimal
 */
export function multiplyDecimals(a: Decimal, b: Decimal): Decimal {
  return a.mul(b);
}
