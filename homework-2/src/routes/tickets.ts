import { Router, Request, Response, NextFunction } from 'express';
import { ticketStorage } from '../services/ticketStorage';
import { classificationService } from '../services/classificationService';
import { CreateTicketSchema, UpdateTicketSchema, CategorySchema, PrioritySchema, StatusSchema } from '../types/ticket';
import { AppError } from '../types/errors';
import { TicketFilters } from '../types/filters';
import logger from '../services/logger';

const router = Router();

// POST /tickets - Create a new ticket
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateTicketSchema.parse(req.body);
    
    // Check if auto-classification is requested
    const autoClassify = req.query.auto_classify === 'true';
    
    // Apply auto-classification if requested or if category/priority missing
    if (autoClassify || !validatedData.category || !validatedData.priority) {
      const classification = classificationService.classify({
        subject: validatedData.subject,
        description: validatedData.description
      });
      
      // Apply classification results if fields are missing
      if (!validatedData.category) {
        validatedData.category = classification.category;
      }
      if (!validatedData.priority) {
        validatedData.priority = classification.priority;
      }
      
      // Set default metadata if not provided
      if (!validatedData.metadata) {
        validatedData.metadata = {
          source: 'api',
          device_type: 'desktop'
        };
      }
      
      const ticket = ticketStorage.create(validatedData);
      
      logger.info('Ticket created with auto-classification', { 
        ticketId: ticket.id, 
        category: ticket.category, 
        priority: ticket.priority,
        confidence: classification.confidence
      });
      
      // Return ticket with classification metadata
      res.status(201).json({
        ...ticket,
        classification_confidence: classification.confidence,
        classification_reasoning: classification.reasoning
      });
    } else {
      const ticket = ticketStorage.create(validatedData);
      
      logger.info('Ticket created', { ticketId: ticket.id, category: ticket.category, priority: ticket.priority });
      
      res.status(201).json(ticket);
    }
  } catch (error) {
    next(error);
  }
});

// GET /tickets - List all tickets with optional filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: TicketFilters = {};

    // Validate and apply filters
    if (req.query.category) {
      const result = CategorySchema.safeParse(req.query.category);
      if (!result.success) {
        throw new AppError(400, `Invalid category filter: ${req.query.category}`);
      }
      filters.category = result.data;
    }

    if (req.query.priority) {
      const result = PrioritySchema.safeParse(req.query.priority);
      if (!result.success) {
        throw new AppError(400, `Invalid priority filter: ${req.query.priority}`);
      }
      filters.priority = result.data;
    }

    if (req.query.status) {
      const result = StatusSchema.safeParse(req.query.status);
      if (!result.success) {
        throw new AppError(400, `Invalid status filter: ${req.query.status}`);
      }
      filters.status = result.data;
    }

    const tickets = ticketStorage.findAll(filters);
    res.json({
      total: tickets.length,
      tickets
    });
  } catch (error) {
    next(error);
  }
});

// GET /tickets/:id - Get specific ticket
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const ticket = ticketStorage.findById(id);
    if (!ticket) {
      throw new AppError(404, `Ticket with id '${id}' not found`);
    }
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// PUT /tickets/:id - Update ticket
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const validatedData = UpdateTicketSchema.parse(req.body);
    const ticket = ticketStorage.update(id, validatedData);
    if (!ticket) {
      throw new AppError(404, `Ticket with id '${id}' not found`);
    }
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// DELETE /tickets/:id - Delete ticket
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const deleted = ticketStorage.delete(id);
    if (!deleted) {
      throw new AppError(404, `Ticket with id '${id}' not found`);
    }
    logger.info('Ticket deleted', { ticketId: id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /tickets/:id/auto-classify - Auto-classify a ticket
router.post('/:id/auto-classify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    
    // Find the ticket
    const ticket = ticketStorage.findById(id);
    if (!ticket) {
      throw new AppError(404, `Ticket with id '${id}' not found`);
    }
    
    // Classify the ticket
    const classification = classificationService.classify({
      subject: ticket.subject,
      description: ticket.description
    });
    
    // Update ticket with classification results
    const updatedTicket = ticketStorage.update(id, {
      category: classification.category,
      priority: classification.priority
    });
    
    logger.info('Ticket auto-classified', { 
      ticketId: id, 
      category: classification.category, 
      priority: classification.priority,
      confidence: classification.confidence
    });
    
    res.json({
      ticket: updatedTicket,
      classification: {
        category: classification.category,
        priority: classification.priority,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        keywords_found: classification.keywords_found
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
