import winston from 'winston';

/**
 * Mask account numbers for PII protection
 * Replaces account pattern like "ACC-1001" with "ACC-****"
 * Handles various formats: ACC-1001, ACC1001, account_1001, etc.
 * @param text Text potentially containing account numbers
 * @returns Text with account numbers masked
 */
export function maskAccountNumber(text: string): string {
  if (!text) return text;

  // Match patterns like "ACC-1001", "ACC1001", "Account 1001", etc.
  // Replace last 4 characters of account identifiers with ****
  return text.replace(/([A-Za-z]+[-\s]?)(\d{4})/g, '$1****');
}

/**
 * Mask sensitive data in log objects
 * @param obj Object potentially containing sensitive fields
 * @returns Object with PII masked
 */
function maskSensitiveFields(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const masked = { ...obj };

  // Mask account-related fields
  if (typeof masked.source_account === 'string') {
    masked.source_account = maskAccountNumber(masked.source_account);
  }
  if (typeof masked.destination_account === 'string') {
    masked.destination_account = maskAccountNumber(masked.destination_account);
  }
  if (typeof masked.transaction === 'object' && masked.transaction) {
    if (typeof masked.transaction.source_account === 'string') {
      masked.transaction.source_account = maskAccountNumber(masked.transaction.source_account);
    }
    if (typeof masked.transaction.destination_account === 'string') {
      masked.transaction.destination_account = maskAccountNumber(
        masked.transaction.destination_account
      );
    }
  }

  return masked;
}

/**
 * Create a Winston logger with PII masking
 * Silent during tests (checks NODE_ENV)
 * @param agentName Name of the agent/component using this logger
 * @returns Winston logger instance
 */
export function createLogger(agentName: string): winston.Logger {
  const isSilent = process.env.NODE_ENV === 'test';

  return winston.createLogger({
    level: isSilent ? 'error' : 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.json()
    ),
    defaultMeta: { agent: agentName },
    transports: isSilent
      ? [new winston.transports.Console({ silent: true })]
      : [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, agent, message, ...meta }) => {
                const maskedMeta = maskSensitiveFields(meta);
                return `[${timestamp}] ${level} [${agent}] ${message} ${
                  Object.keys(maskedMeta).length > 0 ? JSON.stringify(maskedMeta) : ''
                }`.trim();
              })
            ),
          }),
        ],
  });
}

/**
 * Global logger for pipeline integration
 */
export const logger = createLogger('pipeline');
