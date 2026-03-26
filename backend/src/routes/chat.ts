import { Router, Response } from 'express';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { chat } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/classrooms/:id/chat/history?week=1
router.get('/:id/chat/history', requireAuth, (req: AuthRequest, res: Response): void => {
  const weekNumber = parseInt(req.query.week as string || '1', 10);
  const thread = db.prepare(
    'SELECT id FROM chat_threads WHERE student_id = ? AND classroom_id = ? AND week_number = ?'
  ).get(req.user!.id, req.params.id, weekNumber) as any;

  if (!thread) {
    res.json({ messages: [] });
    return;
  }

  const messages = db.prepare(
    'SELECT role, content, created_at FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC'
  ).all(thread.id) as any[];

  res.json({
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
  });
});

// GET /api/classrooms/:id/chat/students?week=1  (teacher only)
router.get('/:id/chat/students', requireAuth, (req: AuthRequest, res: Response): void => {
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!classroom) { res.status(404).json({ message: 'Classroom not found' }); return; }
  if (classroom.teacher_id !== req.user!.id) { res.status(403).json({ message: 'Teachers only' }); return; }

  const weekNumber = parseInt(req.query.week as string || '1', 10);
  const students = db.prepare(
    'SELECT u.id, u.first_name, u.last_name, u.email FROM classroom_students cs JOIN users u ON u.id = cs.student_id WHERE cs.classroom_id = ?'
  ).all(req.params.id) as any[];

  const chats = students.map(student => {
    const thread = db.prepare(
      'SELECT id FROM chat_threads WHERE student_id = ? AND classroom_id = ? AND week_number = ?'
    ).get(student.id, req.params.id, weekNumber) as any;

    const messages = thread
      ? db.prepare('SELECT role, content, created_at FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC').all(thread.id)
      : [];

    return {
      student: { id: student.id, firstName: student.first_name, lastName: student.last_name, email: student.email },
      messages,
    };
  });

  res.json({ chats });
});

// POST /api/classrooms/:id/chat
router.post('/:id/chat', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, weekNumber = 1 } = req.body;
  if (!message?.trim()) {
    res.status(400).json({ message: 'Message required' });
    return;
  }

  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!classroom) {
    res.status(404).json({ message: 'Classroom not found' });
    return;
  }

  // Verify user is enrolled (or is the teacher)
  const isTeacher = classroom.teacher_id === req.user!.id;
  if (!isTeacher) {
    const enrolled = db.prepare(
      'SELECT 1 FROM classroom_students WHERE classroom_id = ? AND student_id = ?'
    ).get(req.params.id, req.user!.id);
    if (!enrolled) {
      res.status(403).json({ message: 'Not enrolled in this classroom' });
      return;
    }
  }

  try {
    const reply = await chat(req.user!.id, req.params.id, weekNumber, message.trim(), classroom.name);

    // Store the messages in our local DB too
    const thread = db.prepare(
      'SELECT id FROM chat_threads WHERE student_id = ? AND classroom_id = ? AND week_number = ?'
    ).get(req.user!.id, req.params.id, weekNumber) as any;

    if (thread) {
      db.prepare('INSERT INTO chat_messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)').run(uuidv4(), thread.id, 'user', message.trim());
      db.prepare('INSERT INTO chat_messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)').run(uuidv4(), thread.id, 'assistant', reply);
    }

    res.json({ reply });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Albus is having trouble right now. Please try again!' });
  }
});

export default router;
