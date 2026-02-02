import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';
import path from 'path';

describe('XML Import', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  it('should successfully import valid XML file', async () => {
    const xmlPath = path.join(__dirname, 'fixtures', 'valid_tickets.xml');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', xmlPath)
      .expect(201);

    expect(response.body.total).toBe(2);
    expect(response.body.successful).toBe(2);
    expect(response.body.failed).toBe(0);
    expect(response.body.tickets).toHaveLength(2);
  });

  it('should handle XML with validation errors', async () => {
    const xmlPath = path.join(__dirname, 'fixtures', 'invalid_tickets.xml');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', xmlPath)
      .expect(201);

    expect(response.body.failed).toBe(1);
    expect(response.body.errors).toHaveLength(1);
  });

  it('should handle malformed XML file', async () => {
    const xmlPath = path.join(__dirname, 'fixtures', 'malformed.xml');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', xmlPath)
      .expect(201);

    expect(response.body.failed).toBeGreaterThan(0);
    // Malformed XML either causes parse error or validation errors
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('should parse nested XML tags correctly', async () => {
    const xmlPath = path.join(__dirname, 'fixtures', 'valid_tickets.xml');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', xmlPath)
      .expect(201);

    const firstTicket = response.body.tickets[0];
    expect(Array.isArray(firstTicket.tags)).toBe(true);
    expect(firstTicket.tags.length).toBeGreaterThan(0);
  });

  it('should parse XML metadata structure', async () => {
    const xmlPath = path.join(__dirname, 'fixtures', 'valid_tickets.xml');
    const response = await request(app)
      .post('/tickets/import')
      .attach('file', xmlPath)
      .expect(201);

    const firstTicket = response.body.tickets[0];
    expect(firstTicket.metadata).toHaveProperty('source');
    expect(firstTicket.metadata).toHaveProperty('device_type');
  });
});
