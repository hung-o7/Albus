import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

import authRoutes from './routes/auth';
import classroomRoutes from './routes/classrooms';
import materialsRoutes from './routes/materials';
import chatRoutes from './routes/chat';
import readingRoutes from './routes/reading';

const app = express();
const PORT = process.env.PORT || 8080;

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const DATA_DIR = path.join(__dirname, '../data');
[UPLOADS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/classrooms', materialsRoutes);
app.use('/api/classrooms', chatRoutes);
app.use('/api/classrooms', readingRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Albus backend running on http://localhost:${PORT}`);
});

export default app;
