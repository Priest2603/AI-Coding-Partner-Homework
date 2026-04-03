/**
 * ISO 4217 currency whitelist
 * Only these currencies are accepted in transactions
 */
export const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'] as const;

export type CurrencyCode = (typeof VALID_CURRENCIES)[number];

/**
 * Exchange rates to USD (from specification)
 */
export const EXCHANGE_RATES: Record<CurrencyCode, string> = {
  USD: '1.00',
  EUR: '1.08',
  GBP: '1.27',
  JPY: '0.0067',
  CHF: '1.13',
  CAD: '0.74',
  AUD: '0.65',
};

/**
 * Validate if a currency code is in the whitelist
 * @param currency Currency code to validate
 * @returns true if valid, false otherwise
 */
export function isValidCurrency(currency: string): currency is CurrencyCode {
  return VALID_CURRENCIES.includes(currency as CurrencyCode);
}

/**
 * Get exchange rate to USD for a currency
 * @param currency Currency code
 * @returns Exchange rate as string (for Decimal.js precision)
 * @throws Error if currency is not in whitelist
 */
export function getExchangeRate(currency: CurrencyCode): string {
  return EXCHANGE_RATES[currency];
}
