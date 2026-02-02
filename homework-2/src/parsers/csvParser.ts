import { parse } from 'csv-parse/sync';
import { CreateTicketSchema } from '../types/ticket';
import { ParseResult } from '../types/parser';

export const parseCSV = (content: string): ParseResult => {
  const result: ParseResult = {
    success: [],
    errors: []
  };

  // Validate basic CSV structure
  if (!content || content.trim().length === 0) {
    result.errors.push({
      line: 0,
      record: null,
      reason: 'Invalid CSV format: file is empty'
    });
    return result;
  }

  let records: any[];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: (value, context) => {
        // Handle array fields (tags)
        if (context.column === 'tags' && value) {
          return value.split('|').map((s: string) => s.trim());
        }
        // Handle nested metadata fields
        return value;
      }
    });

    // Check if we got valid records
    if (!Array.isArray(records) || records.length === 0) {
      result.errors.push({
        line: 0,
        record: null,
        reason: 'Invalid CSV format: no valid records found'
      });
      return result;
    }
  } catch (error: any) {
    // Handle CSV parsing errors
    result.errors.push({
      line: 0,
      record: null,
      reason: `Invalid CSV format: ${error.message}`
    });
    return result;
  }

  // Validate that required columns exist
  const requiredColumns = ['customer_id', 'customer_email', 'customer_name', 'subject', 'description', 'category', 'priority', 'status'];
  const firstRecord = records[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRecord));
  
  if (missingColumns.length > 0) {
    result.errors.push({
      line: 0,
      record: null,
      reason: `Invalid CSV format: missing required columns: ${missingColumns.join(', ')}`
    });
    return result;
  }

  try {
    records.forEach((record: any, index: number) => {
      const lineNumber = index + 2; // +2 for header line and 0-indexing

      try {
        // Check for missing required fields in this record
        const missingFields = requiredColumns.filter(col => !record[col] || record[col].toString().trim() === '');
        if (missingFields.length > 0) {
          throw new Error(`Invalid CSV format at line ${lineNumber}: missing required field '${missingFields[0]}'`);
        }

        // Transform CSV record to ticket format
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
          tags: record.tags || [],
          metadata: {
            source: record.metadata_source || record.source,
            browser: record.metadata_browser || record.browser,
            device_type: record.metadata_device_type || record.device_type
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
    // Catch any unexpected errors during processing
    result.errors.push({
      line: 0,
      record: null,
      reason: `Error processing CSV: ${error.message}`
    });
  }

  return result;
};
