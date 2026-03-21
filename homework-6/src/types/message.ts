import { z } from 'zod';
import { RawTransaction, ValidatedTransaction, FraudScoredTransaction, SettledTransaction } from './transaction';

/**
 * Standard message envelope for inter-agent communication
 * All messages between agents follow this structure
 */
export const AgentMessageSchema = z.object({
  message_id: z.string().uuid('message_id must be UUID v4'),
  timestamp: z.string().datetime('timestamp must be valid ISO 8601'),
  source_agent: z.string().min(1),
  target_agent: z.string().min(1),
  message_type: z.enum(['transaction', 'validation', 'fraud_check', 'settlement']),
  data: z.record(z.any()), // Flexible data object
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Message carrying raw transaction data from integrator to validator
 */
export interface TransactionMessage extends AgentMessage {
  message_type: 'transaction';
  data: {
    transaction: RawTransaction;
  };
}

/**
 * Message carrying validated transaction from validator to fraud detector
 */
export interface ValidationMessage extends AgentMessage {
  message_type: 'validation';
  data: {
    transaction: ValidatedTransaction;
    status: 'validated';
  };
}

/**
 * Message carrying fraud-scored transaction from fraud detector to settlement processor
 */
export interface FraudCheckMessage extends AgentMessage {
  message_type: 'fraud_check';
  data: {
    transaction: FraudScoredTransaction;
    fraud_risk_score: number;
    fraud_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

/**
 * Message carrying settled transaction from settlement processor to results
 */
export interface SettlementMessage extends AgentMessage {
  message_type: 'settlement';
  data: {
    transaction: SettledTransaction;
    settled_at: string;
  };
}

/**
 * Rejection message when transaction is rejected at any stage
 */
export interface RejectionMessage extends AgentMessage {
  message_type: 'transaction' | 'validation' | 'fraud_check' | 'settlement';
  data: {
    transaction_id: string;
    status: 'rejected';
    reasons: string[];
    transaction?: RawTransaction | ValidatedTransaction | FraudScoredTransaction;
  };
}

/**
 * All possible message types in the pipeline
 */
export type PipelineMessage =
  | TransactionMessage
  | ValidationMessage
  | FraudCheckMessage
  | SettlementMessage
  | RejectionMessage;
