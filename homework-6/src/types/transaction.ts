import { z } from 'zod';

/**
 * Zod schema for raw transaction input
 * Matches the structure from sample-transactions.json
 * Required fields (in validation order): transaction_id, timestamp, source_account,
 * destination_account, amount, currency, transaction_type
 */
export const RawTransactionSchema = z.object({
  transaction_id: z.string().min(1, 'transaction_id is required'),
  timestamp: z.string().datetime('timestamp must be valid ISO 8601'),
  source_account: z.string().min(1, 'source_account is required'),
  destination_account: z.string().min(1, 'destination_account is required'),
  amount: z.string().min(1, 'amount is required'),
  currency: z.string().min(1, 'currency is required'),
  transaction_type: z.string().min(1, 'transaction_type is required'),
  description: z.string().optional(),
  metadata: z
    .object({
      channel: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

/**
 * Inferred TypeScript type from RawTransactionSchema
 * Represents a raw transaction before validation
 */
export type RawTransaction = z.infer<typeof RawTransactionSchema>;

/**
 * Transaction record that has passed validation
 * Contains all required fields with confirmed types and formats
 */
export interface ValidatedTransaction extends RawTransaction {
  status: 'validated';
  reasons?: never;
}

/**
 * Transaction record that has been rejected during validation
 * Contains rejection reasons for audit trail
 */
export interface RejectedTransaction {
  transaction_id: string;
  status: 'rejected';
  reasons: string[];
  transaction?: RawTransaction;
}

/**
 * Result of validation processing - either valid or rejected
 */
export type ValidationResult = ValidatedTransaction | RejectedTransaction;

/**
 * Transaction enriched with fraud risk scoring
 */
export interface FraudScoredTransaction extends ValidatedTransaction {
  fraud_risk_score: number;
  fraud_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  fraud_triggers: string[];
}

/**
 * Transaction with settlement information
 */
export interface SettledTransaction extends FraudScoredTransaction {
  converted_amount: string;
  original_currency: string;
  settlement_currency: string;
  fee_percentage: string;
  fee_amount: string;
  wire_surcharge: string;
  total_fees: string;
  settled_amount: string;
  settled_at: string;
}

/**
 * Final pipeline result - either settled or rejected
 */
export type PipelineResult = SettledTransaction | RejectedTransaction | ValidatedTransaction;

/**
 * List of required fields in validation order
 */
export const REQUIRED_FIELDS = [
  'transaction_id',
  'timestamp',
  'source_account',
  'destination_account',
  'amount',
  'currency',
  'transaction_type',
];
