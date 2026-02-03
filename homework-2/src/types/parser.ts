import { CreateTicketInput } from './ticket';

export interface ParsedRecord {
  data: CreateTicketInput;
  line: number;
}

export interface ParseError {
  line: number;
  record: unknown;
  reason: string;
}

export interface ParseResult {
  success: ParsedRecord[];
  errors: ParseError[];
}
