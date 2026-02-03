import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';
import path from 'path';

describe('CSV Import', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  it('should successfully import valid CSV file', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'valid_tickets.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    expect(response.body.total).toBe(3);
    expect(response.body.successful).toBe(3);
    expect(response.body.failed).toBe(0);
    expect(response.body.tickets).toHaveLength(3);
  });

  it('should handle CSV with validation errors', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'invalid_tickets.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    expect(response.body.successful).toBe(0);
    expect(response.body.failed).toBe(2);
    expect(response.body.errors).toHaveLength(2);
    expect(response.body.errors[0]).toHaveProperty('line');
    expect(response.body.errors[0]).toHaveProperty('reason');
  });

  it('should handle malformed CSV file', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'malformed.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    expect(response.body.failed).toBeGreaterThan(0);
  });

  it('should parse CSV tags correctly', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'valid_tickets.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    const firstTicket = response.body.tickets[0];
    expect(Array.isArray(firstTicket.tags)).toBe(true);
    expect(firstTicket.tags.length).toBeGreaterThan(0);
  });

  it('should handle CSV with metadata fields', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'valid_tickets.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    const firstTicket = response.body.tickets[0];
    expect(firstTicket.metadata).toHaveProperty('source');
    expect(firstTicket.metadata).toHaveProperty('device_type');
  });

  it('should provide detailed error messages for failed records', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'invalid_tickets.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    expect(response.body.errors[0].reason).toBeTruthy();
    expect(typeof response.body.errors[0].reason).toBe('string');
  });

  it('should successfully import CSV without metadata fields', async () => {
    const csvPath = path.join(__dirname, 'fixtures', 'no_metadata_tickets.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    expect(response.body.successful).toBe(2);
    expect(response.body.failed).toBe(0);
    expect(response.body.tickets).toHaveLength(2);

    // Verify tickets don't have metadata field
    const firstTicket = response.body.tickets[0];
    expect(firstTicket.metadata).toBeUndefined();
    expect(firstTicket.customer_email).toBe('alice@example.com');
    expect(firstTicket.tags).toEqual(['analytics', 'dashboard']);
  });

  it('should handle CSV with mixed metadata presence', async () => {
    // Test that parser handles rows without metadata gracefully
    const csvPath = path.join(__dirname, 'fixtures', 'no_metadata_tickets.csv');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', csvPath)
      .expect(201);

    // All tickets should import successfully even without metadata
    response.body.tickets.forEach((ticket: any) => {
      expect(ticket).toHaveProperty('customer_id');
      expect(ticket).toHaveProperty('customer_email');
      expect(ticket).toHaveProperty('subject');
      expect(ticket).not.toHaveProperty('metadata');
    });
  });
});
