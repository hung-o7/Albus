import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

function mapUser(row: any) {
  return { id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name, role: row.role, avatarUrl: row.avatar_url ?? null, createdAt: row.created_at };
}

function getTeacher(teacherId: string) {
  return mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(teacherId));
}

function mapClassroom(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    section: row.section ?? null,
    subject: row.subject ?? null,
    inviteCode: row.invite_code,
    bannerColor: row.banner_color,
    readingEnabled: row.reading_enabled === 1,
    teacher: getTeacher(row.teacher_id),
    studentCount: (db.prepare('SELECT COUNT(*) as c FROM classroom_students WHERE classroom_id = ?').get(row.id) as any).c,
    createdAt: row.created_at,
  };
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

// GET /api/classrooms
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const { id, role } = req.user!;
  let rows: any[];
  if (role === 'TEACHER') {
    rows = db.prepare('SELECT * FROM classrooms WHERE teacher_id = ? ORDER BY created_at DESC').all(id);
  } else {
    rows = db.prepare(`
      SELECT c.* FROM classrooms c
      JOIN classroom_students cs ON c.id = cs.classroom_id
      WHERE cs.student_id = ?
      ORDER BY cs.joined_at DESC
    `).all(id);
  }
  res.json(rows.map(mapClassroom));
});

// GET /api/classrooms/:id
router.get('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const row = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!row) { res.status(404).json({ message: 'Classroom not found' }); return; }
  const students = (db.prepare(`
    SELECT u.* FROM users u
    JOIN classroom_students cs ON u.id = cs.student_id
    WHERE cs.classroom_id = ?
    ORDER BY cs.joined_at ASC
  `).all(req.params.id) as any[]).map(mapUser);
  res.json({ ...mapClassroom(row), students });
});

// POST /api/classrooms
router.post('/', requireAuth, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'TEACHER') { res.status(403).json({ message: 'Teachers only' }); return; }
  const { name, description, section, subject, bannerColor, readingEnabled } = req.body;
  if (!name) { res.status(400).json({ message: 'Name required' }); return; }
  const id = uuidv4();
  let inviteCode = generateInviteCode();
  while (db.prepare('SELECT id FROM classrooms WHERE invite_code = ?').get(inviteCode)) {
    inviteCode = generateInviteCode();
  }
  db.prepare(
    'INSERT INTO classrooms (id, name, description, section, subject, invite_code, banner_color, reading_enabled, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, description ?? null, section ?? null, subject ?? null, inviteCode, bannerColor || '#1a6b4a', readingEnabled ? 1 : 0, req.user!.id);
  const row = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id) as any;
  res.status(201).json(mapClassroom(row));
});

// POST /api/classrooms/join
router.post('/join', requireAuth, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'STUDENT') { res.status(403).json({ message: 'Students only' }); return; }
  const { inviteCode } = req.body;
  if (!inviteCode) { res.status(400).json({ message: 'Invite code required' }); return; }
  const classroom = db.prepare('SELECT * FROM classrooms WHERE invite_code = ?').get(inviteCode.toUpperCase()) as any;
  if (!classroom) { res.status(404).json({ message: 'Classroom not found' }); return; }
  const existing = db.prepare('SELECT * FROM classroom_students WHERE classroom_id = ? AND student_id = ?').get(classroom.id, req.user!.id);
  if (existing) { res.status(409).json({ message: 'Already enrolled' }); return; }
  db.prepare('INSERT INTO classroom_students (classroom_id, student_id) VALUES (?, ?)').run(classroom.id, req.user!.id);
  res.json(mapClassroom(classroom));
});

// DELETE /api/classrooms/:id/leave
router.delete('/:id/leave', requireAuth, (req: AuthRequest, res: Response): void => {
  db.prepare('DELETE FROM classroom_students WHERE classroom_id = ? AND student_id = ?').run(req.params.id, req.user!.id);
  res.status(204).send();
});

// DELETE /api/classrooms/:id/students/:studentId
router.delete('/:id/students/:studentId', requireAuth, (req: AuthRequest, res: Response): void => {
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!classroom || classroom.teacher_id !== req.user!.id) { res.status(403).json({ message: 'Forbidden' }); return; }
  db.prepare('DELETE FROM classroom_students WHERE classroom_id = ? AND student_id = ?').run(req.params.id, req.params.studentId);
  res.status(204).send();
});

export default router;
