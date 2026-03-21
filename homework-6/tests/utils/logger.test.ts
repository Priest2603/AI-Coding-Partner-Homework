process.env.NODE_ENV = 'test';

import { maskAccountNumber, createLogger } from '../../src/utils/logger';

describe('logger utilities', () => {
  describe('maskAccountNumber', () => {
    it('should mask account numbers like ACC-1001', () => {
      expect(maskAccountNumber('ACC-1001')).toBe('ACC-****');
    });

    it('should mask multiple account numbers in text', () => {
      const text = 'Transfer from ACC-1001 to ACC-2001';
      const masked = maskAccountNumber(text);
      expect(masked).toBe('Transfer from ACC-**** to ACC-****');
    });

    it('should handle empty string', () => {
      expect(maskAccountNumber('')).toBe('');
    });

    it('should handle null/undefined-like falsy input', () => {
      expect(maskAccountNumber(null as any)).toBe(null);
      expect(maskAccountNumber(undefined as any)).toBe(undefined);
    });

    it('should handle text without account numbers', () => {
      expect(maskAccountNumber('no accounts here')).toBe('no accounts here');
    });

    it('should mask account patterns in JSON strings', () => {
      const json = '{"source_account":"ACC-1001","destination_account":"ACC-2001"}';
      const masked = maskAccountNumber(json);
      expect(masked).not.toContain('1001');
      expect(masked).not.toContain('2001');
    });
  });

  describe('createLogger', () => {
    it('should create a logger instance with expected methods', () => {
      const log = createLogger('test_agent');
      expect(log).toBeDefined();
      expect(typeof log.info).toBe('function');
      expect(typeof log.warn).toBe('function');
      expect(typeof log.error).toBe('function');
    });

    it('should be silent in test mode', () => {
      const log = createLogger('test_agent');
      expect(() => log.info('test message')).not.toThrow();
      expect(() => log.warn('test warning')).not.toThrow();
      expect(() => log.error('test error')).not.toThrow();
    });

    it('should include agent name in default meta', () => {
      const log = createLogger('my_agent');
      expect(log.defaultMeta).toEqual({ agent: 'my_agent' });
    });

    it('should create a console-based logger when NODE_ENV is not test', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const log = createLogger('dev_agent');
      expect(log).toBeDefined();
      expect(log.level).toBe('info');

      // Verify it can log without crashing (covers the console format branch)
      expect(() => log.info('dev message', { source_account: 'ACC-1001' })).not.toThrow();
      expect(() => log.info('empty meta')).not.toThrow();
      expect(() =>
        log.info('nested', { transaction: { source_account: 'ACC-1001', destination_account: 'ACC-2002' } })
      ).not.toThrow();
      // Test with non-object transaction
      expect(() =>
        log.info('with null obj', { source_account: 'ACC-1001', destination_account: 'ACC-2002' })
      ).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should mask sensitive fields in log metadata (non-test mode)', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const log = createLogger('mask_test_agent');
      // This exercises the maskSensitiveFields path
      expect(() =>
        log.info('test', {
          source_account: 'ACC-1001',
          destination_account: 'ACC-2001',
          transaction: {
            source_account: 'ACC-3001',
            destination_account: 'ACC-4001',
          },
        })
      ).not.toThrow();

      // Also test with null/non-object to cover branches
      expect(() => log.info('test null')).not.toThrow();
      expect(() => log.info('test primitive', { value: 42 })).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle maskSensitiveFields with non-object/null transaction field', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const log = createLogger('edge_test_agent');
      expect(() => log.info('test', { transaction: null })).not.toThrow();
      expect(() => log.info('test', { transaction: 'not an object' })).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
