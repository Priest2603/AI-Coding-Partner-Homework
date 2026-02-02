import { randomUUID } from 'crypto';
import { Ticket, CreateTicketInput, UpdateTicketInput } from '../types/ticket';
import { TicketFilters } from '../types/filters';

class TicketStorage {
  private tickets: Map<string, Ticket> = new Map();

  create(input: CreateTicketInput): Ticket {
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: randomUUID(),
      ...input,
      created_at: now,
      updated_at: now,
      resolved_at: input.status === 'resolved' || input.status === 'closed' ? now : null
    };

    this.tickets.set(ticket.id, ticket);
    return ticket;
  }

  findById(id: string): Ticket | undefined {
    return this.tickets.get(id);
  }

  findAll(filters?: TicketFilters): Ticket[] {
    let results = Array.from(this.tickets.values());

    if (filters) {
      if (filters.category) {
        results = results.filter(t => t.category === filters.category);
      }
      if (filters.priority) {
        results = results.filter(t => t.priority === filters.priority);
      }
      if (filters.status) {
        results = results.filter(t => t.status === filters.status);
      }
    }

    return results;
  }

  update(id: string, input: UpdateTicketInput): Ticket | undefined {
    const existing = this.tickets.get(id);
    if (!existing) {
      return undefined;
    }

    const now = new Date().toISOString();
    const updated: Ticket = {
      ...existing,
      ...input,
      id: existing.id, // preserve id
      created_at: existing.created_at, // preserve creation time
      updated_at: now,
      resolved_at: (input.status === 'resolved' || input.status === 'closed') && !existing.resolved_at ? now : existing.resolved_at
    };

    this.tickets.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tickets.delete(id);
  }

  clear(): void {
    this.tickets.clear();
  }

  count(): number {
    return this.tickets.size;
  }
}

export const ticketStorage = new TicketStorage();
