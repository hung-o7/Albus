import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/classrooms/:id/reading
router.get('/:id/reading', requireAuth, (req: AuthRequest, res: Response): void => {
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!classroom) { res.status(404).json({ message: 'Classroom not found' }); return; }
  const assignments = db.prepare(
    'SELECT * FROM reading_assignments WHERE classroom_id = ? ORDER BY created_at DESC'
  ).all(req.params.id) as any[];
  res.json({
    readingEnabled: classroom.reading_enabled === 1,
    assignments: assignments.map(a => ({
      id: a.id, title: a.title, passageText: a.passage_text, createdAt: a.created_at,
    })),
  });
});

// POST /api/classrooms/:id/reading  (teacher only)
router.post('/:id/reading', requireAuth, (req: AuthRequest, res: Response): void => {
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!classroom || classroom.teacher_id !== req.user!.id) { res.status(403).json({ message: 'Teachers only' }); return; }
  const { title, passageText } = req.body;
  if (!title?.trim() || !passageText?.trim()) { res.status(400).json({ message: 'title and passageText required' }); return; }
  const id = uuidv4();
  db.prepare('INSERT INTO reading_assignments (id, classroom_id, title, passage_text) VALUES (?, ?, ?, ?)')
    .run(id, req.params.id, title.trim(), passageText.trim());
  res.status(201).json({ id, title: title.trim(), passageText: passageText.trim() });
});

// DELETE /api/classrooms/:id/reading/:assignmentId  (teacher only)
router.delete('/:id/reading/:assignmentId', requireAuth, (req: AuthRequest, res: Response): void => {
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!classroom || classroom.teacher_id !== req.user!.id) { res.status(403).json({ message: 'Teachers only' }); return; }
  db.prepare('DELETE FROM reading_attempts WHERE assignment_id = ?').run(req.params.assignmentId);
  db.prepare('DELETE FROM reading_assignments WHERE id = ? AND classroom_id = ?').run(req.params.assignmentId, req.params.id);
  res.json({ message: 'Deleted' });
});

// POST /api/classrooms/:id/reading/:assignmentId/attempts  (student submits result)
router.post('/:id/reading/:assignmentId/attempts', requireAuth, (req: AuthRequest, res: Response): void => {
  const { accuracyScore, fluencyScore, prosodyScore, pronunciationScore, wordDetails } = req.body;
  const id = uuidv4();
  db.prepare(
    'INSERT INTO reading_attempts (id, student_id, assignment_id, accuracy_score, fluency_score, prosody_score, pronunciation_score, word_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user!.id, req.params.assignmentId, accuracyScore, fluencyScore, prosodyScore, pronunciationScore, JSON.stringify(wordDetails ?? []));
  res.status(201).json({ id });
});

// GET /api/classrooms/:id/reading/:assignmentId/attempts
// Teacher: all student attempts. Student: own attempts only.
router.get('/:id/reading/:assignmentId/attempts', requireAuth, (req: AuthRequest, res: Response): void => {
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as any;
  if (!classroom) { res.status(404).json({ message: 'Classroom not found' }); return; }

  const isTeacher = classroom.teacher_id === req.user!.id;

  if (isTeacher) {
    const students = db.prepare(
      'SELECT u.id, u.first_name, u.last_name FROM classroom_students cs JOIN users u ON u.id = cs.student_id WHERE cs.classroom_id = ?'
    ).all(req.params.id) as any[];

    const result = students.map(student => {
      const attempts = db.prepare(
        'SELECT * FROM reading_attempts WHERE student_id = ? AND assignment_id = ? ORDER BY created_at ASC'
      ).all(student.id, req.params.assignmentId) as any[];
      return {
        student: { id: student.id, firstName: student.first_name, lastName: student.last_name },
        attempts: attempts.map(a => ({
          id: a.id, accuracyScore: a.accuracy_score, fluencyScore: a.fluency_score,
          prosodyScore: a.prosody_score, pronunciationScore: a.pronunciation_score,
          wordDetails: JSON.parse(a.word_details), createdAt: a.created_at,
        })),
      };
    });
    res.json({ studentAttempts: result });
  } else {
    const attempts = db.prepare(
      'SELECT * FROM reading_attempts WHERE student_id = ? AND assignment_id = ? ORDER BY created_at ASC'
    ).all(req.user!.id, req.params.assignmentId) as any[];
    res.json({
      attempts: attempts.map(a => ({
        id: a.id, accuracyScore: a.accuracy_score, fluencyScore: a.fluency_score,
        prosodyScore: a.prosody_score, pronunciationScore: a.pronunciation_score,
        wordDetails: JSON.parse(a.word_details), createdAt: a.created_at,
      })),
    });
  }
});

export default router;
