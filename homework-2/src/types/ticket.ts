import { z } from 'zod';

// Enum schemas
export const CategorySchema = z.enum([
  'account_access',
  'technical_issue',
  'billing_question',
  'feature_request',
  'bug_report',
  'other'
]);

export const PrioritySchema = z.enum(['urgent', 'high', 'medium', 'low']);

export const StatusSchema = z.enum([
  'new',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed'
]);

export const SourceSchema = z.enum([
  'web_form',
  'email',
  'api',
  'chat',
  'phone'
]);

export const DeviceTypeSchema = z.enum(['desktop', 'mobile', 'tablet']);

// Metadata schema
export const MetadataSchema = z.object({
  source: SourceSchema,
  browser: z.string().optional(),
  device_type: DeviceTypeSchema.optional()
});

// Full ticket schema for creation (without id, timestamps)
export const CreateTicketSchema = z.object({
  customer_id: z.string().min(1, 'customer_id is required'),
  customer_email: z.string().email('Invalid email format'),
  customer_name: z.string().min(1, 'customer_name is required'),
  subject: z.string().min(1, 'subject must be at least 1 character').max(200, 'subject must be at most 200 characters'),
  description: z.string().min(10, 'description must be at least 10 characters').max(2000, 'description must be at most 2000 characters'),
  category: CategorySchema.optional(),
  priority: PrioritySchema.optional(),
  status: StatusSchema.default('new'),
  assigned_to: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional()
});

// Full ticket schema (with id and timestamps)
export const TicketSchema = CreateTicketSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable().optional(),
  classification_confidence: z.number().min(0).max(1).optional(),
  classification_reasoning: z.string().optional()
});

// Update ticket schema (all fields optional except validated ones)
// Remove defaults to prevent partial updates from overwriting existing values
export const UpdateTicketSchema = CreateTicketSchema.partial().omit({}).extend({
  status: StatusSchema.optional(),
  tags: z.array(z.string()).optional()
});

// TypeScript types
export type Category = z.infer<typeof CategorySchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type DeviceType = z.infer<typeof DeviceTypeSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
