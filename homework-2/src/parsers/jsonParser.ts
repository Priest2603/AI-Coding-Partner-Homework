import { CreateTicketSchema } from '../types/ticket';
import { ParseResult } from '../types/parser';

export const parseJSON = (content: string): ParseResult => {
  const result: ParseResult = {
    success: [],
    errors: []
  };

  // Validate basic JSON structure
  if (!content || content.trim().length === 0) {
    result.errors.push({
      line: 0,
      record: null,
      reason: 'Invalid JSON format: file is empty'
    });
    return result;
  }

  let data: any;
  try {
    data = JSON.parse(content);
  } catch (error: any) {
    result.errors.push({
      line: 0,
      record: null,
      reason: `Invalid JSON format: ${error.message}`
    });
    return result;
  }

  try {
    const records = Array.isArray(data) ? data : [data];

    if (records.length === 0) {
      result.errors.push({
        line: 0,
        record: null,
        reason: 'Invalid JSON format: no records found'
      });
      return result;
    }

    records.forEach((record: any, index: number) => {
      const lineNumber = index + 1;

      try {
        // Validate with Zod
        const validated = CreateTicketSchema.parse(record);
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
      reason: `Error processing JSON: ${error.message}`
    });
  }

  return result;
};
