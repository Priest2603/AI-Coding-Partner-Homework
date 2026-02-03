import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  describe('Import Endpoint', () => {
    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/tickets/import')
        .expect(400);

      expect(response.body.error).toContain('No file uploaded');
    });

    it('should reject unsupported file format', async () => {
      const response = await request(app)
        .post('/tickets/import')
        .attach('file', Buffer.from('test data'), 'test.txt')
        .expect(400);

      expect(response.body.error).toContain('Unsupported file format');
    });
  });

  describe('Filter Validation', () => {
    it('should reject invalid category filter', async () => {
      const response = await request(app)
        .get('/tickets?category=invalid_category')
        .expect(400);

      expect(response.body.error).toContain('Invalid category filter');
    });

    it('should reject invalid priority filter', async () => {
      const response = await request(app)
        .get('/tickets?priority=invalid_priority')
        .expect(400);

      expect(response.body.error).toContain('Invalid priority filter');
    });

    it('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/tickets?status=invalid_status')
        .expect(400);

      expect(response.body.error).toContain('Invalid status filter');
    });
  });

  describe('Ticket Creation Edge Cases', () => {
    it('should handle tickets with empty tags array', async () => {
      const ticket = {
        customer_id: 'CUST001',
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        subject: 'Test Subject',
        description: 'This is a test description with sufficient length.',
        category: 'technical_issue',
        priority: 'medium',
        status: 'new',
        assigned_to: null,
        tags: [],
        metadata: {
          source: 'web_form',
          device_type: 'desktop'
        }
      };

      const response = await request(app)
        .post('/tickets')
        .send(ticket)
        .expect(201);

      expect(response.body.tags).toEqual([]);
    });

    it('should handle tickets without optional browser field', async () => {
      const ticket = {
        customer_id: 'CUST001',
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        subject: 'Test Subject',
        description: 'This is a test description with sufficient length.',
        category: 'technical_issue',
        priority: 'medium',
        status: 'new',
        tags: [],
        metadata: {
          source: 'api',
          device_type: 'mobile'
        }
      };

      const response = await request(app)
        .post('/tickets')
        .send(ticket)
        .expect(201);

      expect(response.body.metadata).not.toHaveProperty('browser');
    });
  });

  describe('Ticket Update Edge Cases', () => {
    it('should update resolved_at when status changes to resolved', async () => {
      const ticket = {
        customer_id: 'CUST001',
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        subject: 'Test Subject',
        description: 'This is a test description with sufficient length.',
        category: 'technical_issue',
        priority: 'medium',
        status: 'new',
        tags: [],
        metadata: {
          source: 'web_form',
          device_type: 'desktop'
        }
      };

      const createResponse = await request(app)
        .post('/tickets')
        .send(ticket)
        .expect(201);

      const ticketId = createResponse.body.id;
      expect(createResponse.body.resolved_at).toBeNull();

      const updateResponse = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ status: 'resolved' })
        .expect(200);

      expect(updateResponse.body.resolved_at).toBeTruthy();
    });

    it('should update resolved_at when status changes to closed', async () => {
      const ticket = {
        customer_id: 'CUST001',
        customer_email: 'test@example.com',
        customer_name: 'Test User',
        subject: 'Test Subject',
        description: 'This is a test description with sufficient length.',
        category: 'technical_issue',
        priority: 'medium',
        status: 'new',
        tags: [],
        metadata: {
          source: 'web_form',
          device_type: 'desktop'
        }
      };

      const createResponse = await request(app)
        .post('/tickets')
        .send(ticket)
        .expect(201);

      const ticketId = createResponse.body.id;

      const updateResponse = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ status: 'closed' })
        .expect(200);

      expect(updateResponse.body.resolved_at).toBeTruthy();
    });
  });

  describe('Storage Operations', () => {
    it('should return empty list when no tickets exist', async () => {
      const response = await request(app)
        .get('/tickets')
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.tickets).toEqual([]);
    });

    it('should handle deletion of non-existent ticket', async () => {
      await request(app)
        .delete('/tickets/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
