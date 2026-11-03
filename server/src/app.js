import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { dbState } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { originGuard } from './middleware/originGuard.js';
import adminRoutes from './routes/admin.js';
import authRouter from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import contactRouter from './routes/contact.js';
import departureRoutes from './routes/departures.js';
import packageRoutes from './routes/packages.js';
import paymentRoutes from './routes/payments.js';
import userRoutes from './routes/users.js';
import { ok } from './utils/respond.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', env.trustProxy); // real client IPs behind hosting proxies
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', originGuard);
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => ok(res, { status: 'ok', db: dbState() }));
  app.use('/api/packages', packageRoutes);
  app.use('/api/departures', departureRoutes);
  app.use('/api/contact', contactRouter());
  app.use('/api/auth', authRouter());
  app.use('/api/users', userRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
