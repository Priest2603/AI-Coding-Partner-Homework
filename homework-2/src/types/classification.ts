import { z } from 'zod';
import { CategorySchema, PrioritySchema } from './ticket';

/**
 * Classification result returned by the classification service
 */
export const ClassificationResultSchema = z.object({
  category: CategorySchema,
  priority: PrioritySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  keywords_found: z.array(z.string())
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

/**
 * Input for classification request
 */
export interface ClassificationInput {
  subject: string;
  description: string;
}
