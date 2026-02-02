import { XMLParser } from 'fast-xml-parser';
import { CreateTicketSchema } from '../types/ticket';
import { ParseResult } from '../types/parser';

export const parseXML = (content: string): ParseResult => {
  const result: ParseResult = {
    success: [],
    errors: []
  };

  // Validate basic XML structure
  if (!content || content.trim().length === 0) {
    result.errors.push({
      line: 0,
      record: null,
      reason: 'Invalid XML format: file is empty'
    });
    return result;
  }

  let parsed: any;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
      trimValues: true,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });

    parsed = parser.parse(content);
  } catch (error: any) {
    result.errors.push({
      line: 0,
      record: null,
      reason: `Invalid XML format: ${error.message}`
    });
    return result;
  }

  try {
    // Handle different XML structures
    let records: any[] = [];
    if (parsed.tickets) {
      records = Array.isArray(parsed.tickets.ticket) 
        ? parsed.tickets.ticket 
        : [parsed.tickets.ticket];
    } else if (parsed.ticket) {
      records = Array.isArray(parsed.ticket) ? parsed.ticket : [parsed.ticket];
    } else {
      result.errors.push({
        line: 0,
        record: null,
        reason: 'Invalid XML structure: expected <tickets> or <ticket> root element'
      });
      return result;
    }

    if (records.length === 0 || !records[0]) {
      result.errors.push({
        line: 0,
        record: null,
        reason: 'Invalid XML format: no records found'
      });
      return result;
    }

    records.forEach((record: any, index: number) => {
      const lineNumber = index + 1;

      try {
        // Transform XML record to ticket format
        const ticketData: any = {
          customer_id: record.customer_id,
          customer_email: record.customer_email,
          customer_name: record.customer_name,
          subject: record.subject,
          description: record.description,
          category: record.category,
          priority: record.priority,
          status: record.status,
          assigned_to: record.assigned_to || null,
          tags: record.tags ? (Array.isArray(record.tags.tag) ? record.tags.tag : [record.tags.tag]) : [],
          metadata: {
            source: record.metadata?.source || record.source,
            browser: record.metadata?.browser || record.browser,
            device_type: record.metadata?.device_type || record.device_type
          }
        };

        // Validate with Zod
        const validated = CreateTicketSchema.parse(ticketData);
        result.success.push({
          data: validated,
          line: lineNumber
        });
      } catch (error: any) {
        result.errors.push({
          line: lineNumber,
          record,
          reason: error.message || 'Validation failed'
        });
      }
    });
  } catch (error: any) {
    result.errors.push({
      line: 0,
      record: null,
      reason: `Error processing XML: ${error.message}`
    });
  }

  return result;
};
