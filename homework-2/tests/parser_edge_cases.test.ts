import request from 'supertest';
import app from '../src/index';
import { ticketStorage } from '../src/services/ticketStorage';

describe('Additional Parser Edge Cases', () => {
  beforeEach(() => {
    ticketStorage.clear();
  });

  describe('CSV Parser Edge Cases', () => {
    it('should handle empty CSV file', async () => {
      const emptyCSV = '';
      const buffer = Buffer.from(emptyCSV);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'empty.csv')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors[0].reason).toContain('file is empty');
    });

    it('should handle CSV with no records', async () => {
      const emptyCSV = 'customer_id,customer_email,customer_name,subject,description,category,priority,status,source\n';
      const buffer = Buffer.from(emptyCSV);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'no_records.csv')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors[0].reason).toContain('no valid records found');
    });

    it('should handle CSV missing required columns', async () => {
      const csvMissingColumns = 'customer_id,customer_email\nCUST001,test@example.com';
      const buffer = Buffer.from(csvMissingColumns);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'missing_columns.csv')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors[0].reason).toContain('missing required columns');
    });

    it('should handle CSV with empty required field', async () => {
      const csvEmptyField = `customer_id,customer_email,customer_name,subject,description,category,priority,status,source
CUST001,,John Doe,Test Subject,Test description here,technical_issue,medium,new,web_form`;
      const buffer = Buffer.from(csvEmptyField);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'empty_field.csv')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors[0].reason).toContain('missing required field');
    });
  });

  describe('JSON Parser Edge Cases', () => {
    it('should handle empty JSON file', async () => {
      const emptyJSON = '';
      const buffer = Buffer.from(emptyJSON);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'empty.json')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors[0].reason).toContain('file is empty');
    });

    it('should handle empty JSON array', async () => {
      const emptyArray = '[]';
      const buffer = Buffer.from(emptyArray);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'empty_array.json')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors[0].reason).toContain('no records found');
    });
  });

  describe('XML Parser Edge Cases', () => {
    it('should handle empty XML file', async () => {
      const emptyXML = '';
      const buffer = Buffer.from(emptyXML);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'empty.xml')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors[0].reason).toContain('file is empty');
    });

    it('should handle XML with empty tickets element', async () => {
      const emptyXML = '<tickets></tickets>';
      const buffer = Buffer.from(emptyXML);

      const response = await request(app)
        .post('/tickets/import')
        .attach('file', buffer, 'empty_tickets.xml')
        .expect(201);

      expect(response.body.successful).toBe(0);
      expect(response.body.failed).toBe(1);
      // Empty tickets element doesn't have a ticket property, so it falls to the else case
      expect(response.body.errors[0].reason).toContain('expected <tickets> or <ticket> root element');
    });
  });

  describe('Storage Edge Cases', () => {
    it('should handle update with partial data', async () => {
      const ticket = ticketStorage.create({
        customer_id: 'CUST001',
        customer_email: 'test@example.com',
        customer_name: 'John Doe',
        subject: 'Test Subject',
        description: 'Test description here for the ticket',
        category: 'technical_issue',
        priority: 'medium',
        status: 'new',
        tags: [],
        metadata: {
          source: 'web_form',
          device_type: 'desktop'
        }
      });

      const response = await request(app)
        .put(`/tickets/${ticket.id}`)
        .send({
          subject: 'Updated Subject'
        })
        .expect(200);

      expect(response.body.subject).toBe('Updated Subject');
      expect(response.body.description).toBe('Test description here for the ticket');
    });

    it('should count tickets correctly', () => {
      expect(ticketStorage.count()).toBe(0);

      ticketStorage.create({
        customer_id: 'CUST001',
        customer_email: 'test@example.com',
        customer_name: 'John Doe',
        subject: 'Test Subject',
        description: 'Test description here for the ticket',
        category: 'technical_issue',
        priority: 'medium',
        status: 'new',
        tags: [],
        metadata: {
          source: 'web_form',
          device_type: 'desktop'
        }
      });

      expect(ticketStorage.count()).toBe(1);
    });
  });
});
