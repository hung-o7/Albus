import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function mapUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    createdAt: row.created_at,
  };
}

function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '30d' }
  );
}

router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: 'Email and password required' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }
  res.json({ token: signToken(user), user: mapUser(user) });
});

router.post('/register', (req: Request, res: Response): void => {
  const { email, password, firstName, lastName, role } = req.body;
  if (!email || !password || !firstName || !lastName || !role) {
    res.status(400).json({ message: 'All fields required' });
    return;
  }
  if (!['TEACHER', 'STUDENT'].includes(role)) {
    res.status(400).json({ message: 'Role must be TEACHER or STUDENT' });
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ message: 'Email already in use' });
    return;
  }
  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email, passwordHash, firstName, lastName, role);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  res.status(201).json({ token: signToken(user), user: mapUser(user) });
});

router.get('/me', requireAuth, (req: AuthRequest, res: Response): void => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(mapUser(user));
});

router.get('/speech-token', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';
  if (!key) { res.status(503).json({ message: 'Azure Speech not configured. Add AZURE_SPEECH_KEY to backend/.env' }); return; }
  try {
    const response = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key } }
    );
    if (!response.ok) { res.status(502).json({ message: 'Failed to get Azure token' }); return; }
    const token = await response.text();
    res.json({ token, region });
  } catch {
    res.status(502).json({ message: 'Failed to reach Azure Speech service' });
  }
});

router.patch('/profile', requireAuth, (req: AuthRequest, res: Response): void => {
  const { bio } = req.body;
  if (typeof bio !== 'string') { res.status(400).json({ message: 'bio must be a string' }); return; }
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio.trim(), req.user!.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
  res.json(mapUser(user));
});

export default router;
