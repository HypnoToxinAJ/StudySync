import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import trackerRouter from './routes/tracker.routes.js';

/**
 * ============================================================================
 * STANDALONE EXPRESS SERVER SETUP FOR ATTENDANCE & CT MARKS TRACKER
 * ============================================================================
 */

const app = express();
const PORT = process.env.TRACKER_PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studysync_tracker';

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'StudySync Attendance & CT Marks Tracker API', timestamp: new Date() });
});

// Mount Tracker REST API routes
app.use('/api/tracker', trackerRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Tracker API Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection helper
export const startTrackerServer = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB successfully for Tracker Service.');
    }
    const server = app.listen(PORT, () => {
      console.log(`StudySync Tracker API running on http://localhost:${PORT}/api/tracker`);
    });
    return server;
  } catch (error) {
    console.error('Failed to start tracker server:', error);
    process.exit(1);
  }
};

export default app;
