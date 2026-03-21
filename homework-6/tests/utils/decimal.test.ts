process.env.NODE_ENV = 'test';

import {
  Decimal,
  parseDecimal,
  isPositive,
  formatMoney,
  calculatePercentage,
  addMoney,
  subtractMoney,
  multiplyDecimals,
} from '../../src/utils/decimal';

describe('decimal utilities', () => {
  describe('parseDecimal', () => {
    it('should parse a valid numeric string', () => {
      const result = parseDecimal('1500.00');
      expect(result.toString()).toBe('1500');
    });

    it('should parse integers', () => {
      const result = parseDecimal('100');
      expect(result.toNumber()).toBe(100);
    });

    it('should parse negative numbers', () => {
      const result = parseDecimal('-100.00');
      expect(result.toNumber()).toBe(-100);
    });

    it('should parse very large numbers', () => {
      const result = parseDecimal('99999999999.99');
      expect(result.toString()).toBe('99999999999.99');
    });

    it('should parse zero', () => {
      const result = parseDecimal('0');
      expect(result.toNumber()).toBe(0);
    });

    it('should parse number type input', () => {
      const result = parseDecimal(42);
      expect(result.toNumber()).toBe(42);
    });

    it('should throw for invalid input', () => {
      expect(() => parseDecimal('not-a-number')).toThrow();
      expect(() => parseDecimal('')).toThrow();
    });
  });

  describe('isPositive', () => {
    it('should return true for positive values', () => {
      expect(isPositive(new Decimal('100'))).toBe(true);
      expect(isPositive(new Decimal('0.01'))).toBe(true);
    });

    it('should return false for zero', () => {
      expect(isPositive(new Decimal('0'))).toBe(false);
    });

    it('should return false for negative values', () => {
      expect(isPositive(new Decimal('-100'))).toBe(false);
      expect(isPositive(new Decimal('-0.01'))).toBe(false);
    });
  });

  describe('formatMoney', () => {
    it('should format to 2 decimal places', () => {
      expect(formatMoney(new Decimal('1234.5'))).toBe('1234.50');
      expect(formatMoney(new Decimal('1234'))).toBe('1234.00');
      expect(formatMoney(new Decimal('1234.567'))).toBe('1234.57'); // ROUND_HALF_UP
    });

    it('should format zero correctly', () => {
      expect(formatMoney(new Decimal('0'))).toBe('0.00');
    });

    it('should handle very small amounts', () => {
      expect(formatMoney(new Decimal('0.001'))).toBe('0.00');
      expect(formatMoney(new Decimal('0.005'))).toBe('0.01'); // ROUND_HALF_UP
    });

    it('should handle large amounts', () => {
      expect(formatMoney(new Decimal('75000.00'))).toBe('75000.00');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage with string input', () => {
      const amount = new Decimal('10000');
      const result = calculatePercentage(amount, '0.001'); // 0.1%
      expect(formatMoney(result)).toBe('10.00');
    });

    it('should calculate percentage with Decimal input', () => {
      const amount = new Decimal('10000');
      const percentage = new Decimal('0.005'); // 0.5%
      const result = calculatePercentage(amount, percentage);
      expect(formatMoney(result)).toBe('50.00');
    });

    it('should handle zero amount', () => {
      const result = calculatePercentage(new Decimal('0'), '0.001');
      expect(formatMoney(result)).toBe('0.00');
    });

    it('should handle zero percentage', () => {
      const result = calculatePercentage(new Decimal('10000'), '0');
      expect(formatMoney(result)).toBe('0.00');
    });
  });

  describe('addMoney', () => {
    it('should add two amounts', () => {
      const result = addMoney(new Decimal('100.50'), new Decimal('25.00'));
      expect(formatMoney(result)).toBe('125.50');
    });

    it('should handle adding zero', () => {
      const result = addMoney(new Decimal('100'), new Decimal('0'));
      expect(formatMoney(result)).toBe('100.00');
    });
  });

  describe('subtractMoney', () => {
    it('should subtract two amounts', () => {
      const result = subtractMoney(new Decimal('100.50'), new Decimal('25.00'));
      expect(formatMoney(result)).toBe('75.50');
    });

    it('should handle subtracting zero', () => {
      const result = subtractMoney(new Decimal('100'), new Decimal('0'));
      expect(formatMoney(result)).toBe('100.00');
    });

    it('should produce negative result when b > a', () => {
      const result = subtractMoney(new Decimal('10'), new Decimal('100'));
      expect(result.isNegative()).toBe(true);
    });
  });

  describe('multiplyDecimals', () => {
    it('should multiply two decimals', () => {
      const result = multiplyDecimals(new Decimal('500'), new Decimal('1.08'));
      expect(formatMoney(result)).toBe('540.00');
    });

    it('should handle multiplication by 1', () => {
      const result = multiplyDecimals(new Decimal('1500'), new Decimal('1.00'));
      expect(formatMoney(result)).toBe('1500.00');
    });

    it('should handle multiplication by small rate (JPY)', () => {
      const result = multiplyDecimals(new Decimal('10000'), new Decimal('0.0067'));
      expect(formatMoney(result)).toBe('67.00');
    });
  });
});
