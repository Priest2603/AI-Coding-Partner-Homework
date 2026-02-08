import multer from 'multer';
import { Router, Request, Response, NextFunction } from 'express';
import { ticketStorage } from '../services/ticketStorage';
import { AppError } from '../types/errors';
import logger from '../services/logger';
import { parseCSV } from '../parsers/csvParser';
import { parseJSON } from '../parsers/jsonParser';
import { parseXML } from '../parsers/xmlParser';

const router = Router();

// Configure multer for file upload (10MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// POST /tickets/import - Bulk import from CSV/JSON/XML
router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded. Please provide a file with field name "file"');
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const fileName = req.file.originalname.toLowerCase();

    let parseResult;

    // Detect format and parse
    if (fileName.endsWith('.csv')) {
      parseResult = parseCSV(fileContent);
    } else if (fileName.endsWith('.json')) {
      parseResult = parseJSON(fileContent);
    } else if (fileName.endsWith('.xml')) {
      parseResult = parseXML(fileContent);
    } else {
      throw new AppError(400, 'Unsupported file format. Please upload CSV, JSON, or XML file');
    }

    // Import successful records
    const imported = parseResult.success.map(({ data }) => ticketStorage.create(data));

    // Format errors
    const errors = parseResult.errors.map(({ line, record, reason }) => ({
      line,
      record,
      reason
    }));

    logger.info('Bulk import completed', { 
      total: parseResult.success.length + parseResult.errors.length,
      successful: parseResult.success.length,
      failed: parseResult.errors.length,
      format: fileName.split('.').pop()
    });

    res.status(201).json({
      total: parseResult.success.length + parseResult.errors.length,
      successful: parseResult.success.length,
      failed: parseResult.errors.length,
      errors,
      tickets: imported
    });
  } catch (error) {
    next(error);
  }
});

export default router;
