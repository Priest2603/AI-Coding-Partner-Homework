import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';
import path from 'path';

describe('Integration Tests', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  const validTicket = {
    customer_id: 'CUST001',
    customer_email: 'integration@example.com',
    customer_name: 'Integration Test',
    subject: 'Integration test ticket',
    description: 'This is an integration test for the complete ticket lifecycle.',
    category: 'technical_issue',
    priority: 'high',
    status: 'new',
    assigned_to: null,
    tags: ['integration', 'test'],
    metadata: {
      source: 'api',
      browser: 'Chrome',
      device_type: 'desktop'
    }
  };

  it('should complete full ticket lifecycle', async () => {
    // Create ticket
    const createResponse = await request(app)
      .post('/tickets')
      .send(validTicket)
      .expect(201);

    const ticketId = createResponse.body.id;
    expect(ticketId).toBeTruthy();

    // Get ticket
    const getResponse = await request(app)
      .get(`/tickets/${ticketId}`)
      .expect(200);
    expect(getResponse.body.status).toBe('new');

    // Update ticket
    const updateResponse = await request(app)
      .put(`/tickets/${ticketId}`)
      .send({ status: 'in_progress', assigned_to: 'agent1' })
      .expect(200);
    expect(updateResponse.body.status).toBe('in_progress');
    expect(updateResponse.body.assigned_to).toBe('agent1');

    // Update again to resolved
    await request(app)
      .put(`/tickets/${ticketId}`)
      .send({ status: 'resolved' })
      .expect(200);

    // Delete ticket
    await request(app)
      .delete(`/tickets/${ticketId}`)
      .expect(204);

    // Verify deletion
    await request(app)
      .get(`/tickets/${ticketId}`)
      .expect(404);
  });

  it('should handle bulk import and verify tickets', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'valid_tickets.csv');
    const importResponse = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    expect(importResponse.body.successful).toBeGreaterThan(0);

    // Verify tickets are accessible
    const listResponse = await request(app)
      .get('/tickets')
      .expect(200);

    expect(listResponse.body.total).toBe(importResponse.body.successful);
  });

  it('should handle concurrent ticket creation', async () => {
    const promises = Array.from({ length: 20 }, (_, i) =>
      request(app)
        .post('/tickets')
        .send({
          ...validTicket,
          customer_email: `user${i}@example.com`,
          subject: `Concurrent ticket ${i}`
        })
    );

    const responses = await Promise.all(promises);

    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    const listResponse = await request(app)
      .get('/tickets')
      .expect(200);

    expect(listResponse.body.total).toBe(20);
  });

  it('should filter tickets by multiple criteria', async () => {
    // Create tickets with different attributes
    await request(app).post('/tickets').send(validTicket);
    await request(app).post('/tickets').send({ ...validTicket, category: 'billing_question', priority: 'low', customer_email: 'user2@example.com' });
    await request(app).post('/tickets').send({ ...validTicket, category: 'technical_issue', priority: 'high', customer_email: 'user3@example.com' });

    // Filter by category and priority
    const response = await request(app)
      .get('/tickets?category=technical_issue&priority=high')
      .expect(200);

    expect(response.body.total).toBe(2);
    response.body.tickets.forEach((ticket: any) => {
      expect(ticket.category).toBe('technical_issue');
      expect(ticket.priority).toBe('high');
    });
  });

  it('should handle mixed format imports in sequence', async () => {
    // Import CSV
    const csvPath = path.join(__dirname, 'fixtures', 'valid_tickets.csv');
    const csvResponse = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    // Import JSON
    const jsonPath = path.join(__dirname, 'fixtures', 'valid_tickets.json');
    const jsonResponse = await request(app)
      .post('/tickets/import')
      .attach('file', jsonPath)
      .expect(201);

    // Import XML
    const xmlPath = path.join(__dirname, 'fixtures', 'valid_tickets.xml');
    const xmlResponse = await request(app)
      .post('/tickets/import')
      .attach('file', xmlPath)
      .expect(201);

    const totalImported = csvResponse.body.successful + jsonResponse.body.successful + xmlResponse.body.successful;

    // Verify all tickets are stored
    const listResponse = await request(app)
      .get('/tickets')
      .expect(200);

    expect(listResponse.body.total).toBe(totalImported);
  });
});
