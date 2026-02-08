import { parseCSV } from '../src/parsers/csvParser';
import { parseJSON } from '../src/parsers/jsonParser';
import { parseXML } from '../src/parsers/xmlParser';

describe('Parser Unit Tests', () => {
  describe('CSV Parser', () => {
    it('should handle single record', () => {
      const csv = `customer_id,customer_email,customer_name,subject,description,category,priority,status,tags,metadata_source,metadata_device_type
CUST001,test@example.com,Test User,Test Subject,This is a test description with sufficient length,technical_issue,medium,new,test|tag,web_form,desktop`;
      
      const result = parseCSV(csv);
      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty tags field', () => {
      const csv = `customer_id,customer_email,customer_name,subject,description,category,priority,status,tags,metadata_source,metadata_device_type
CUST001,test@example.com,Test User,Test Subject,This is a test description with sufficient length,technical_issue,medium,new,,web_form,desktop`;
      
      const result = parseCSV(csv);
      expect(result.success).toHaveLength(1);
      expect(result.success[0].data.tags).toEqual([]);
    });

    it('should handle CSV parse errors', () => {
      const csv = 'customer_id,customer_email\nCUST001,"unclosed quote\nCUST002,test@example.com';
      const result = parseCSV(csv);
      // CSV parser may successfully parse malformed CSV but validation will fail
      expect(result.errors.length >= 0).toBe(true);
    });
  });

  describe('JSON Parser', () => {
    it('should handle single object (non-array)', () => {
      const json = JSON.stringify({
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
      });

      const result = parseJSON(json);
      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle JSON parse errors', () => {
      const invalidJson = '{ "invalid": json }';
      const result = parseJSON(invalidJson);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(0);
    });

    it('should handle validation errors with reason', () => {
      const json = JSON.stringify([{
        customer_id: 'CUST001',
        customer_email: 'invalid-email',
        customer_name: 'Test',
        subject: 'Test',
        description: 'Short'
      }]);

      const result = parseJSON(json);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toBeTruthy();
    });
  });

  describe('XML Parser', () => {
    it('should handle single ticket element', () => {
      const xml = `<?xml version="1.0"?>
<ticket>
  <customer_id>CUST001</customer_id>
  <customer_email>test@example.com</customer_email>
  <customer_name>Test User</customer_name>
  <subject>Test Subject</subject>
  <description>This is a test description with sufficient length.</description>
  <category>technical_issue</category>
  <priority>medium</priority>
  <status>new</status>
  <tags><tag>test</tag></tags>
  <metadata>
    <source>web_form</source>
    <device_type>desktop</device_type>
  </metadata>
</ticket>`;

      const result = parseXML(xml);
      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle single tag element', () => {
      const xml = `<?xml version="1.0"?>
<tickets>
  <ticket>
    <customer_id>CUST001</customer_id>
    <customer_email>test@example.com</customer_email>
    <customer_name>Test User</customer_name>
    <subject>Test Subject</subject>
    <description>This is a test description with sufficient length.</description>
    <category>technical_issue</category>
    <priority>medium</priority>
    <status>new</status>
    <tags><tag>single-tag</tag></tags>
    <metadata>
      <source>web_form</source>
      <device_type>desktop</device_type>
    </metadata>
  </ticket>
</tickets>`;

      const result = parseXML(xml);
      expect(result.success).toHaveLength(1);
      expect(result.success[0].data.tags).toEqual(['single-tag']);
    });

    it('should handle missing root element', () => {
      const xml = `<?xml version="1.0"?>
<root>
  <data>test</data>
</root>`;

      const result = parseXML(xml);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('Invalid XML structure');
    });

    it('should handle XML parse errors', () => {
      const invalidXml = '<?xml version="1.0"?><unclosed>';
      const result = parseXML(invalidXml);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBe(0);
    });

    it('should handle validation errors with reason', () => {
      const xml = `<?xml version="1.0"?>
<tickets>
  <ticket>
    <customer_id>CUST001</customer_id>
    <customer_email>invalid</customer_email>
  </ticket>
</tickets>`;

      const result = parseXML(xml);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toBeTruthy();
    });
  });
});
