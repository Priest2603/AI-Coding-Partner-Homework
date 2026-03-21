process.env.NODE_ENV = 'test';

import { isValidCurrency, getExchangeRate, VALID_CURRENCIES, EXCHANGE_RATES, CurrencyCode } from '../../src/utils/currencies';

describe('currencies', () => {
  describe('VALID_CURRENCIES', () => {
    it('should contain expected ISO 4217 currencies', () => {
      expect(VALID_CURRENCIES).toContain('USD');
      expect(VALID_CURRENCIES).toContain('EUR');
      expect(VALID_CURRENCIES).toContain('GBP');
      expect(VALID_CURRENCIES).toContain('JPY');
      expect(VALID_CURRENCIES).toContain('CHF');
      expect(VALID_CURRENCIES).toContain('CAD');
      expect(VALID_CURRENCIES).toContain('AUD');
      expect(VALID_CURRENCIES).toHaveLength(7);
    });
  });

  describe('EXCHANGE_RATES', () => {
    it('should have a rate for every valid currency', () => {
      for (const currency of VALID_CURRENCIES) {
        expect(EXCHANGE_RATES[currency]).toBeDefined();
        expect(typeof EXCHANGE_RATES[currency]).toBe('string');
      }
    });

    it('should have USD rate of 1.00', () => {
      expect(EXCHANGE_RATES.USD).toBe('1.00');
    });

    it('should have rates as numeric strings', () => {
      for (const currency of VALID_CURRENCIES) {
        expect(Number(EXCHANGE_RATES[currency])).not.toBeNaN();
        expect(Number(EXCHANGE_RATES[currency])).toBeGreaterThan(0);
      }
    });
  });

  describe('isValidCurrency', () => {
    it('should return true for all valid currencies', () => {
      for (const currency of VALID_CURRENCIES) {
        expect(isValidCurrency(currency)).toBe(true);
      }
    });

    it('should return false for invalid currency codes', () => {
      expect(isValidCurrency('XYZ')).toBe(false);
      expect(isValidCurrency('ABC')).toBe(false);
      expect(isValidCurrency('')).toBe(false);
      expect(isValidCurrency('usd')).toBe(false); // lowercase
    });

    it('should return false for partial matches', () => {
      expect(isValidCurrency('US')).toBe(false);
      expect(isValidCurrency('USDD')).toBe(false);
    });
  });

  describe('getExchangeRate', () => {
    it('should return correct rate for USD', () => {
      expect(getExchangeRate('USD')).toBe('1.00');
    });

    it('should return correct rate for EUR', () => {
      expect(getExchangeRate('EUR')).toBe('1.08');
    });

    it('should return correct rate for GBP', () => {
      expect(getExchangeRate('GBP')).toBe('1.27');
    });

    it('should return correct rate for JPY', () => {
      expect(getExchangeRate('JPY')).toBe('0.0067');
    });

    it('should return a string for every valid currency', () => {
      for (const currency of VALID_CURRENCIES) {
        const rate = getExchangeRate(currency);
        expect(typeof rate).toBe('string');
      }
    });
  });
});
