import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';
import path from 'path';

describe('JSON Import', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  it('should successfully import valid JSON file', async () => {
    const jsonPath = path.join(__dirname, 'fixtures', 'valid_tickets.json');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', jsonPath)
      .expect(201);

    expect(response.body.total).toBe(2);
    expect(response.body.successful).toBe(2);
    expect(response.body.failed).toBe(0);
    expect(response.body.tickets).toHaveLength(2);
  });

  it('should handle JSON with validation errors', async () => {
    const jsonPath = path.join(__dirname, 'fixtures', 'invalid_tickets.json');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', jsonPath)
      .expect(201);

    expect(response.body.failed).toBe(1);
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0]).toHaveProperty('reason');
  });

  it('should handle malformed JSON file', async () => {
    const jsonPath = path.join(__dirname, 'fixtures', 'malformed.json');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', jsonPath)
      .expect(201);

    expect(response.body.failed).toBeGreaterThan(0);
    expect(response.body.errors[0].reason).toContain('Invalid JSON format');
  });

  it('should preserve nested metadata structure', async () => {
    const jsonPath = path.join(__dirname, 'fixtures', 'valid_tickets.json');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', jsonPath)
      .expect(201);

    const firstTicket = response.body.tickets[0];
    expect(firstTicket.metadata).toHaveProperty('source');
    expect(firstTicket.metadata).toHaveProperty('browser');
    expect(firstTicket.metadata).toHaveProperty('device_type');
  });

  it('should handle JSON arrays correctly', async () => {
    const jsonPath = path.join(__dirname, 'fixtures', 'valid_tickets.json');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', jsonPath)
      .expect(201);

    const firstTicket = response.body.tickets[0];
    expect(Array.isArray(firstTicket.tags)).toBe(true);
  });
});
