import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DatabaseConnection } from '@handoverkey/database';
import { 
  securityHeaders, 
  rateLimiter, 
  corsOptions, 
  validateContentType, 
  sanitizeInput 
} from './middleware/security';
import authRoutes from './routes/auth-routes';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Initialize database connection
DatabaseConnection.initialize();

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(rateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validation and sanitization middleware
app.use(validateContentType);
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await DatabaseConnection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await DatabaseConnection.close();
  process.exit(0);
});

export default app; 