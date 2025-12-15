// Backend server entry point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/firebase'; // Initialize Firebase

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001; // Changed to 5001 to avoid conflict with macOS AirPlay

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Firebase health check endpoint
app.get('/health/firebase', async (req, res) => {
  try {
    const { db } = await import('./config/firebase');
    // Try to read from Firestore to verify connection
    await db.collection('_health').limit(1).get();
    res.json({ status: 'ok', message: 'Firebase connection is working' });
  } catch (error: any) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Firebase connection failed',
      error: error.message 
    });
  }
});

// Routes
import csvRoutes from './routes/csvRoutes';
import questionnaireRoutes from './routes/questionnaireRoutes';
import responseRoutes from './routes/responseRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import exportRoutes from './routes/exportRoutes';
import customerRoutes from './routes/customerRoutes';

app.use('/api/csv', csvRoutes);
app.use('/api/questionnaires', questionnaireRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics/export', exportRoutes);
app.use('/api/customers', customerRoutes);
// app.use('/api/trees', treeRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

