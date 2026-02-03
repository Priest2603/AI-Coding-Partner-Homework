import express from 'express';
import cors from 'cors';
import ticketRoutes from './routes/tickets';
import importRoutes from './routes/import';
import { errorHandler } from './middleware/errorHandler';
import logger from './services/logger';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/tickets/import', importRoutes);
app.use('/tickets', ticketRoutes);

// Error handling
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;
