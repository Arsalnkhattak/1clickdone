/**
 * 1Click Server — Entry Point
 * Express application setup with MongoDB connection, middleware, routes,
 * and graceful shutdown handling.
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import env from './config/env.js';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import documentRoutes from './modules/documents/document.routes.js';
import layoutRoutes from './modules/print-layouts/layout.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import printJobRoutes from './modules/print-jobs/printJob.routes.js';
import { startRetentionSchedule } from './utils/fileRetention.js';

// Initialize Express app
const app = express();

// ──────────────────────────────────────
// Middleware
// ──────────────────────────────────────

// CORS — allow frontend dev server and production Netlify URL
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL, // Set this in Render to your Netlify URL e.g. https://your-app.netlify.app
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ──────────────────────────────────────
// Routes
// ──────────────────────────────────────

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '1Click API is running',
    data: {
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/print-layouts', layoutRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/print-jobs', printJobRoutes);

// 404 handler for undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ──────────────────────────────────────
// Global Error Handler (must be last)
// ──────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────
// Start Server
// ──────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 1Click server running on port ${env.PORT} (${env.NODE_ENV})`);
      console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
      // Start file retention cleanup schedule (every 12h, remove files older than 24h)
      startRetentionSchedule(12, 24);
    });

    // Handle port already in use gracefully
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${env.PORT} is already in use. Stop the other process first.`);
        process.exit(1);
      } else {
        throw err;
      }
    });

    // ──────────────────────────────────────
    // Graceful Shutdown Handling
    // ──────────────────────────────────────
    const gracefulShutdown = (signal) => {
      console.log(`\n⚡ ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
