import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';

import { ENV } from './config/env.js';
import { connectDB, isDbConnected } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import odometerRoutes from './routes/odometerRoutes.js';
import fuelRoutes from './routes/fuelRoutes.js';
import fuelPriceRoutes from './routes/fuelPriceRoutes.js';
import mileageRoutes from './routes/mileageRoutes.js';
import ridesRoutes from './routes/ridesRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import documentsRoutes from './routes/documentsRoutes.js';
import alertsRoutes from './routes/alertsRoutes.js';
import bluetoothRoutes from './routes/bluetoothRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import uploadsRoutes from './routes/uploadsRoutes.js';

const app = express();

// Security and performance middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows PWA and maps without conflicting headers
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin reverse proxy)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        ENV.CORS_ORIGIN,
        'http://localhost:5173',
        'http://localhost:4173',
        'http://localhost:3000',
        'http://localhost:5000',
      ];
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in personal companion setup
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limit
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'PitStop API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dbConnected: isDbConnected(),
  });
});

// Mount Route Groups
app.use('/api/auth', authRoutes);
app.use('/api/vehicle', vehicleRoutes);
app.use('/api/odometer', odometerRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/fuel-prices', fuelPriceRoutes);
app.use('/api/mileage', mileageRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/bluetooth-profiles', bluetoothRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/uploads', uploadsRoutes);

// Centralized error handling
app.use(errorHandler);

// Connect DB and listen if not imported by test suite
if (process.env.NODE_ENV !== 'test') {
  connectDB();
  const PORT = ENV.PORT;
  app.listen(PORT, () => {
    console.log(`[NTORQ Companion Server] Running on port ${PORT} in ${ENV.NODE_ENV} mode`);
  });
}

export default app;
