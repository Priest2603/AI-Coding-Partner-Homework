import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types/errors';
import logger from '../services/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  return res.status(500).json({
    error: 'Internal server error'
  });
};
