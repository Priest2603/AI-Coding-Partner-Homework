import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';
import { classificationService } from '../src/services/classificationService';
import { CreateTicketInput } from '../src/types/ticket';

describe('Ticket Auto-Classification', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  const baseTicket: CreateTicketInput = {
    customer_id: 'cust-123',
    customer_email: 'test@example.com',
    customer_name: 'Test User',
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
    status: 'new',
    tags: [],
    metadata: {
      source: 'web_form',
      device_type: 'desktop'
    }
  };

  describe('Category Classification', () => {
    it('should classify as account_access when login keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Cannot login to my account',
        description: 'I forgot my password and cannot access my account'
      });

      expect(result.category).toBe('account_access');
      expect(result.keywords_found).toContain('login');
      expect(result.keywords_found).toContain('password');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify as technical_issue when bug keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Application crashes on startup',
        description: 'The app shows an error message and crashes immediately'
      });

      expect(result.category).toBe('technical_issue');
      expect(result.keywords_found).toContain('crash');
      expect(result.keywords_found).toContain('error');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify as billing_question when payment keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Question about my invoice',
        description: 'I need a refund for the payment made last month'
      });

      expect(result.category).toBe('billing_question');
      expect(result.keywords_found).toContain('invoice');
      expect(result.keywords_found).toContain('refund');
      expect(result.keywords_found).toContain('payment');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify as feature_request when enhancement keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Suggestion for improvement',
        description: 'I would like to request a new feature for better user experience'
      });

      expect(result.category).toBe('feature_request');
      expect(result.keywords_found).toContain('suggestion');
      expect(result.keywords_found).toContain('request');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify as bug_report when defect keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Found a defect in the system',
        description: 'Here are the steps to reproduce this issue consistently'
      });

      expect(result.category).toBe('bug_report');
      expect(result.keywords_found).toContain('defect');
      expect(result.keywords_found).toContain('reproduce');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify as other when no specific keywords match', () => {
      const result = classificationService.classify({
        subject: 'General inquiry',
        description: 'Just wanted to reach out and say hello'
      });

      expect(result.category).toBe('other');
      expect(Array.isArray(result.keywords_found)).toBe(true);
      expect(result.keywords_found).toHaveLength(0);
    });
  });

  describe('Priority Classification', () => {
    it('should classify as urgent when critical keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Critical issue - production down',
        description: "Can't access the system and it's a security concern"
      });

      expect(result.priority).toBe('urgent');
      expect(result.keywords_found).toContain('critical');
      expect(result.keywords_found).toContain('production down');
      expect(result.keywords_found).toContain('security');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should classify as high when important keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Important issue blocking our work',
        description: 'This is blocking our team and we need it asap'
      });

      expect(result.priority).toBe('high');
      expect(result.keywords_found).toContain('important');
      expect(result.keywords_found).toContain('blocking');
      expect(result.keywords_found).toContain('asap');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify as low when minor keywords are present', () => {
      const result = classificationService.classify({
        subject: 'Minor cosmetic issue',
        description: 'This is just a suggestion for a small improvement'
      });

      expect(result.priority).toBe('low');
      expect(result.keywords_found).toContain('minor');
      expect(result.keywords_found).toContain('cosmetic');
      expect(result.keywords_found).toContain('suggestion');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should default to medium priority when no priority keywords match', () => {
      const result = classificationService.classify({
        subject: 'Regular question',
        description: 'I have a question about the product'
      });

      expect(result.priority).toBe('medium');
    });
  });

  describe('Weighted Confidence Calculation', () => {
    it('should calculate higher confidence with more keywords matched', () => {
      const lowConfidence = classificationService.classify({
        subject: 'Issue with login',
        description: 'Having some trouble logging in'
      });

      const highConfidence = classificationService.classify({
        subject: 'Critical security issue - cannot access account',
        description: 'Production down, cannot login with password, urgent security concern'
      });

      expect(typeof lowConfidence.confidence).toBe('number');
      expect(typeof highConfidence.confidence).toBe('number');
      expect(highConfidence.confidence).toBeGreaterThan(lowConfidence.confidence as number);
    });

    it('should give higher weight to urgent priority keywords', () => {
      const result = classificationService.classify({
        subject: 'Critical production down',
        description: 'This is a security issue'
      });

      // Urgent keywords (critical, production down, security) should result in high confidence
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.priority).toBe('urgent');
    });
  });

  describe('Most Weight Wins - Category Conflicts', () => {
    it('should choose category with most matched keywords', () => {
      const result = classificationService.classify({
        subject: 'Login issue with payment',
        description: 'Cannot access account to view invoice and process refund for billing question'
      });

      // billing_question has more keywords: payment, invoice, refund, billing (4)
      // account_access has: login, access (2)
      expect(result.category).toBe('billing_question');
      const billingKeywords = (result.keywords_found as string[]).filter(k => 
        ['payment', 'invoice', 'refund', 'billing'].includes(k)
      );
      expect(billingKeywords.length).toBeGreaterThan(0);
    });
  });

  describe('POST /tickets/:id/auto-classify Endpoint', () => {
    it('should classify an existing ticket and return classification result', async () => {
      const ticket = await request(app)
        .post('/tickets')
        .send({
          ...baseTicket,
          subject: 'Cannot login',
          description: 'My password is not working and I need access urgently'
        })
        .expect(201);

      const response = await request(app)
        .post(`/tickets/${ticket.body.id}/auto-classify`)
        .expect(200);

      expect(response.body).toHaveProperty('ticket');
      expect(response.body).toHaveProperty('classification');
      expect(response.body.classification).toHaveProperty('category');
      expect(response.body.classification).toHaveProperty('priority');
      expect(response.body.classification).toHaveProperty('confidence');
      expect(response.body.classification).toHaveProperty('reasoning');
      expect(response.body.classification).toHaveProperty('keywords_found');
      expect(response.body.classification.category).toBe('account_access');
      expect(response.body.classification.priority).toBe('urgent');
      expect(response.body.ticket.category).toBe('account_access');
      expect(response.body.ticket.priority).toBe('urgent');
    });

    it('should return 404 for non-existent ticket', async () => {
      await request(app)
        .post('/tickets/00000000-0000-0000-0000-000000000000/auto-classify')
        .expect(404);
    });
  });

  describe('Auto-Classify on Creation with Query Parameter', () => {
    it('should auto-classify when auto_classify=true query param is provided', async () => {
      const response = await request(app)
        .post('/tickets?auto_classify=true')
        .send({
          ...baseTicket,
          subject: 'Critical bug in production',
          description: 'Application crashes with error message'
        })
        .expect(201);

      expect(response.body).toHaveProperty('classification_confidence');
      expect(response.body).toHaveProperty('classification_reasoning');
      expect(response.body.classification_confidence).toBeGreaterThan(0);
      expect(response.body.classification_reasoning).toContain('keywords');
    });

    it('should not auto-classify when auto_classify param is not provided', async () => {
      const response = await request(app)
        .post('/tickets')
        .send({
          ...baseTicket,
          subject: 'Regular ticket',
          description: 'This is a regular ticket without auto-classification'
        })
        .expect(201);

      expect(response.body).not.toHaveProperty('classification_confidence');
      expect(response.body).not.toHaveProperty('classification_reasoning');
    });

    it('should not auto-classify when auto_classify=false', async () => {
      const response = await request(app)
        .post('/tickets?auto_classify=false')
        .send({
          ...baseTicket,
          subject: 'Regular ticket',
          description: 'This is a regular ticket without auto-classification'
        })
        .expect(201);

      expect(response.body).not.toHaveProperty('classification_confidence');
      expect(response.body).not.toHaveProperty('classification_reasoning');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description gracefully', () => {
      const result = classificationService.classify({
        subject: 'Help',
        description: ''
      });

      expect(result.category).toBe('other');
      expect(result.priority).toBe('medium');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should be case-insensitive when matching keywords', () => {
      const lowercase = classificationService.classify({
        subject: 'cannot login',
        description: 'password issue'
      });

      const uppercase = classificationService.classify({
        subject: 'CANNOT LOGIN',
        description: 'PASSWORD ISSUE'
      });

      const mixedcase = classificationService.classify({
        subject: 'Cannot Login',
        description: 'Password Issue'
      });

      expect(lowercase.category).toBe('account_access');
      expect(uppercase.category).toBe('account_access');
      expect(mixedcase.category).toBe('account_access');
    });

    it('should include reasoning when keywords are found', () => {
      const result = classificationService.classify({
        subject: 'Login problem',
        description: 'Cannot access my account'
      });

      expect(result.reasoning).toContain('Detected keywords');
      expect(result.reasoning).toContain('login');
    });

    it('should provide default reasoning when no keywords match', () => {
      const result = classificationService.classify({
        subject: 'Hello',
        description: 'Just saying hi'
      });

      expect(result.reasoning).toContain('No specific keywords detected');
      expect(result.reasoning).toContain('defaults');
    });
  });
});
