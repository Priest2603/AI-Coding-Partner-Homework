import { CreateTicketSchema, CategorySchema, PrioritySchema, StatusSchema } from '../src/types/ticket';
import { ZodError } from 'zod';

describe('Ticket Model Validation', () => {
  const validTicketData = {
    customer_id: 'CUST001',
    customer_email: 'test@example.com',
    customer_name: 'Test User',
    subject: 'Test Subject',
    description: 'This is a test description with more than 10 characters.',
    category: 'technical_issue' as const,
    priority: 'medium' as const,
    status: 'new' as const,
    assigned_to: null,
    tags: ['test'],
    metadata: {
      source: 'web_form' as const,
      browser: 'Chrome',
      device_type: 'desktop' as const
    }
  };

  describe('Email Validation', () => {
    it('should accept valid email addresses', () => {
      const result = CreateTicketSchema.safeParse(validTicketData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidData = { ...validTicketData, customer_email: 'not-an-email' };
      expect(() => CreateTicketSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject empty email', () => {
      const invalidData = { ...validTicketData, customer_email: '' };
      expect(() => CreateTicketSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe('Subject Validation', () => {
    it('should accept subject within 1-200 character range', () => {
      const result = CreateTicketSchema.safeParse({
        ...validTicketData,
        subject: 'Valid subject'
      });
      expect(result.success).toBe(true);
    });

    it('should reject subject longer than 200 characters', () => {
      const invalidData = { ...validTicketData, subject: 'a'.repeat(201) };
      expect(() => CreateTicketSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject empty subject', () => {
      const invalidData = { ...validTicketData, subject: '' };
      expect(() => CreateTicketSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe('Description Validation', () => {
    it('should accept description within 10-2000 character range', () => {
      const result = CreateTicketSchema.safeParse(validTicketData);
      expect(result.success).toBe(true);
    });

    it('should reject description shorter than 10 characters', () => {
      const invalidData = { ...validTicketData, description: 'short' };
      expect(() => CreateTicketSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('should reject description longer than 2000 characters', () => {
      const invalidData = { ...validTicketData, description: 'a'.repeat(2001) };
      expect(() => CreateTicketSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe('Enum Validations', () => {
    it('should validate category enum values', () => {
      const validCategories = ['account_access', 'technical_issue', 'billing_question', 'feature_request', 'bug_report', 'other'];
      validCategories.forEach(category => {
        const result = CategorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });

      const invalidResult = CategorySchema.safeParse('invalid_category');
      expect(invalidResult.success).toBe(false);
    });

    it('should validate priority enum values', () => {
      const validPriorities = ['urgent', 'high', 'medium', 'low'];
      validPriorities.forEach(priority => {
        const result = PrioritySchema.safeParse(priority);
        expect(result.success).toBe(true);
      });

      const invalidResult = PrioritySchema.safeParse('invalid_priority');
      expect(invalidResult.success).toBe(false);
    });

    it('should validate status enum values', () => {
      const validStatuses = ['new', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
      validStatuses.forEach(status => {
        const result = StatusSchema.safeParse(status);
        expect(result.success).toBe(true);
      });

      const invalidResult = StatusSchema.safeParse('invalid_status');
      expect(invalidResult.success).toBe(false);
    });
  });
});
