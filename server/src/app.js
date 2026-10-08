import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { ValidationError, UniqueConstraintError } from 'sequelize';
import { auditLogger } from './middleware/audit.js';
import { HttpError } from './utils/http.js';
import authRoutes from './routes/auth.js';
import startupRoutes from './routes/startups.js';
import documentRoutes from './routes/documents.js';
import milestoneRoutes from './routes/milestones.js';
import mentorRoutes from './routes/mentors.js';
import fundingRoutes from './routes/funding.js';
import meetingRoutes from './routes/meetings.js';
import feedbackRoutes from './routes/feedback.js';
import workshopRoutes from './routes/workshops.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import investorRoutes from './routes/investors.js';
import peopleRoutes from './routes/people.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(','), credentials: true, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use(auditLogger);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/startups', startupRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/funding', fundingRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/investors', investorRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// Serve the built React app (single-server deployment) when it exists.
const clientDist = path.resolve('..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(clientDist, 'index.html')) : next()));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, ...err.extra });
  if (err instanceof UniqueConstraintError) return res.status(409).json({ message: 'A record with these details already exists' });
  if (err instanceof ValidationError) return res.status(400).json({ message: err.errors.map((e) => e.message).join(', ') });
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `File is too large (max ${process.env.MAX_UPLOAD_MB || 10} MB)` : err.message;
    return res.status(400).json({ message: msg });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

export default app;
