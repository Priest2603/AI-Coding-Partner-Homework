import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';

describe('Ticket API Endpoints', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  const validTicket = {
    customer_id: 'CUST001',
    customer_email: 'john.doe@example.com',
    customer_name: 'John Doe',
    subject: 'Cannot login to my account',
    description: 'I have been trying to login for the past hour but keep getting an error message.',
    category: 'account_access',
    priority: 'high',
    status: 'new',
    assigned_to: null,
    tags: ['login', 'urgent'],
    metadata: {
      source: 'web_form',
      browser: 'Chrome',
      device_type: 'desktop'
    }
  };

  describe('POST /tickets', () => {
    it('should create a new ticket with valid data', async () => {
      const response = await request(app)
        .post('/tickets')
        .send(validTicket)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.customer_email).toBe(validTicket.customer_email);
      expect(response.body.subject).toBe(validTicket.subject);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
    });

    it('should reject ticket with invalid email', async () => {
      const invalidTicket = { ...validTicket, customer_email: 'not-an-email' };
      const response = await request(app)
        .post('/tickets')
        .send(invalidTicket)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject ticket with subject too long', async () => {
      const invalidTicket = { ...validTicket, subject: 'a'.repeat(201) };
      const response = await request(app)
        .post('/tickets')
        .send(invalidTicket)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject ticket with description too short', async () => {
      const invalidTicket = { ...validTicket, description: 'short' };
      const response = await request(app)
        .post('/tickets')
        .send(invalidTicket)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /tickets', () => {
    it('should return all tickets', async () => {
      await request(app).post('/tickets').send(validTicket);
      await request(app).post('/tickets').send({ ...validTicket, customer_email: 'jane@example.com' });

      const response = await request(app)
        .get('/tickets')
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.tickets).toHaveLength(2);
    });

    it('should filter tickets by category', async () => {
      await request(app).post('/tickets').send(validTicket);
      await request(app).post('/tickets').send({ ...validTicket, category: 'billing_question', customer_email: 'jane@example.com' });

      const response = await request(app)
        .get('/tickets?category=account_access')
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.tickets[0].category).toBe('account_access');
    });

    it('should filter tickets by priority', async () => {
      await request(app).post('/tickets').send(validTicket);
      await request(app).post('/tickets').send({ ...validTicket, priority: 'low', customer_email: 'jane@example.com' });

      const response = await request(app)
        .get('/tickets?priority=high')
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.tickets[0].priority).toBe('high');
    });
  });

  describe('GET /tickets/:id', () => {
    it('should return a specific ticket', async () => {
      const createResponse = await request(app).post('/tickets').send(validTicket);
      const ticketId = createResponse.body.id;

      const response = await request(app)
        .get(`/tickets/${ticketId}`)
        .expect(200);

      expect(response.body.id).toBe(ticketId);
      expect(response.body.subject).toBe(validTicket.subject);
    });

    it('should return 404 for non-existent ticket', async () => {
      const response = await request(app)
        .get('/tickets/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /tickets/:id', () => {
    it('should update a ticket', async () => {
      const createResponse = await request(app).post('/tickets').send(validTicket);
      const ticketId = createResponse.body.id;

      const response = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.status).toBe('in_progress');
      expect(response.body.updated_at).not.toBe(createResponse.body.updated_at);
    });

    it('should return 404 when updating non-existent ticket', async () => {
      await request(app)
        .put('/tickets/00000000-0000-0000-0000-000000000000')
        .send({ status: 'resolved' })
        .expect(404);
    });

    it('should preserve existing status when updating other fields', async () => {
      const createResponse = await request(app).post('/tickets').send(validTicket);
      const ticketId = createResponse.body.id;

      // Update only assigned_to field
      const response = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ assigned_to: 'agent123' })
        .expect(200);

      // Status should remain unchanged from original 'new'
      expect(response.body.assigned_to).toBe('agent123');
      expect(response.body.status).toBe('new');
      expect(response.body.tags).toEqual(['login', 'urgent']);
    });

    it('should preserve existing tags when updating other fields', async () => {
      const createResponse = await request(app).post('/tickets').send(validTicket);
      const ticketId = createResponse.body.id;

      // Update only priority field
      const response = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ priority: 'urgent' })
        .expect(200);

      // Tags should remain unchanged
      expect(response.body.priority).toBe('urgent');
      expect(response.body.tags).toEqual(['login', 'urgent']);
      expect(response.body.status).toBe('new');
    });

    it('should allow partial updates without resetting defaults', async () => {
      // Create ticket with specific status and tags
      const ticketWithCustomFields = {
        ...validTicket,
        status: 'in_progress',
        tags: ['vip', 'critical', 'escalated']
      };
      const createResponse = await request(app).post('/tickets').send(ticketWithCustomFields);
      const ticketId = createResponse.body.id;

      // Update only the subject
      const response = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ subject: 'Updated subject line' })
        .expect(200);

      // All other fields should be preserved
      expect(response.body.subject).toBe('Updated subject line');
      expect(response.body.status).toBe('in_progress');
      expect(response.body.tags).toEqual(['vip', 'critical', 'escalated']);
    });
  });

  describe('DELETE /tickets/:id', () => {
    it('should delete a ticket', async () => {
      const createResponse = await request(app).post('/tickets').send(validTicket);
      const ticketId = createResponse.body.id;

      await request(app)
        .delete(`/tickets/${ticketId}`)
        .expect(204);

      await request(app)
        .get(`/tickets/${ticketId}`)
        .expect(404);
    });
  });
});
