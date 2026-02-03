import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';

describe('Performance Tests', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  const validTicket = {
    customer_id: 'CUST001',
    customer_email: 'perf@example.com',
    customer_name: 'Performance Test',
    subject: 'Performance test ticket',
    description: 'This is a performance test ticket with sufficient description length.',
    category: 'technical_issue',
    priority: 'medium',
    status: 'new',
    assigned_to: null,
    tags: ['performance'],
    metadata: {
      source: 'api',
      browser: 'Chrome',
      device_type: 'desktop'
    }
  };

  it('should create 100 tickets within acceptable time', async () => {
    const startTime = Date.now();
    const promises = Array.from({ length: 100 }, (_, i) =>
      request(app)
        .post('/tickets')
        .send({ ...validTicket, customer_email: `user${i}@example.com` })
    );

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should retrieve tickets quickly with filtering', async () => {
    // Pre-populate with tickets
    const promises = Array.from({ length: 50 }, (_, i) =>
      request(app)
        .post('/tickets')
        .send({
          ...validTicket,
          customer_email: `user${i}@example.com`,
          category: i % 2 === 0 ? 'technical_issue' : 'billing_question'
        })
    );
    await Promise.all(promises);

    const startTime = Date.now();
    await request(app)
      .get('/tickets?category=technical_issue')
      .expect(200);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Should complete within 100ms
  });

  it('should handle rapid ticket updates', async () => {
    const createResponse = await request(app)
      .post('/tickets')
      .send(validTicket)
      .expect(201);

    const ticketId = createResponse.body.id;
    const startTime = Date.now();

    const updatePromises = Array.from({ length: 20 }, () =>
      request(app)
        .put(`/tickets/${ticketId}`)
        .send({ status: 'in_progress' })
    );

    await Promise.all(updatePromises);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should list large number of tickets efficiently', async () => {
    // Create 200 tickets
    const promises = Array.from({ length: 200 }, (_, i) =>
      request(app)
        .post('/tickets')
        .send({ ...validTicket, customer_email: `user${i}@example.com` })
    );
    await Promise.all(promises);

    const startTime = Date.now();
    const response = await request(app)
      .get('/tickets')
      .expect(200);
    const duration = Date.now() - startTime;

    expect(response.body.total).toBe(200);
    expect(duration).toBeLessThan(200); // Should complete within 200ms
  });

  it('should handle concurrent mixed operations', async () => {
    const startTime = Date.now();

    const operations = [
      // Creates
      ...Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/tickets')
          .send({ ...validTicket, customer_email: `create${i}@example.com` })
      ),
      // Reads (after initial create)
      ...Array.from({ length: 5 }, () =>
        request(app).get('/tickets')
      )
    ];

    await Promise.all(operations);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
  });
});
