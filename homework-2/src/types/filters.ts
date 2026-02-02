import { Category, Priority, Status } from './ticket';

export interface TicketFilters {
  category?: Category;
  priority?: Priority;
  status?: Status;
}
