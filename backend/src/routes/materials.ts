import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { extractText } from '../services/fileProcessor';

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOCX, and PPTX files are allowed'));
  },
});

// POST /api/classrooms/:id/materials
router.post('/:id/materials', requireAuth, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'TEACHER') {
    res.status(403).json({ message: 'Teachers only' });
    return;
  }

  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?').get(req.params.id, req.user!.id) as any;
  if (!classroom) {
    res.status(404).json({ message: 'Classroom not found or you are not the teacher' });
    return;
  }

  upload.array('files', 20)(req, res, async (err) => {
    if (err) {
      res.status(400).json({ message: err.message });
      return;
    }

    const weekNumber = parseInt(req.body.weekNumber || '1', 10);
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    try {
      const results = [];
      for (const file of files) {
        const ext = path.extname(file.originalname).slice(1).toLowerCase();
        let extractedText = '';

        try {
          extractedText = await extractText(file.path, ext);
        } catch (e) {
          console.error('Text extraction failed:', e);
        }

        const materialId = uuidv4();
        db.prepare(`
          INSERT INTO course_materials (id, classroom_id, week_number, filename, original_name, file_type, extracted_text, openai_file_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(materialId, req.params.id, weekNumber, file.filename, file.originalname, ext, extractedText, null);

        results.push({
          id: materialId,
          originalName: file.originalname,
          fileType: ext,
          weekNumber,
          uploadedAt: new Date().toISOString(),
        });
      }

      res.json({ message: `Uploaded ${results.length} file(s)`, materials: results });
    } catch (error: any) {
      console.error('Material upload error:', error);
      res.status(500).json({ message: error.message || 'Upload failed' });
    }
  });
});

// DELETE /api/classrooms/:id/materials/:materialId
router.delete('/:id/materials/:materialId', requireAuth, (req: AuthRequest, res: Response): void => {
  if (req.user!.role !== 'TEACHER') { res.status(403).json({ message: 'Teachers only' }); return; }
  const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?').get(req.params.id, req.user!.id) as any;
  if (!classroom) { res.status(404).json({ message: 'Classroom not found or you are not the teacher' }); return; }
  const material = db.prepare('SELECT * FROM course_materials WHERE id = ? AND classroom_id = ?').get(req.params.materialId, req.params.id) as any;
  if (!material) { res.status(404).json({ message: 'Material not found' }); return; }
  const filePath = path.join(UPLOADS_DIR, material.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM course_materials WHERE id = ?').run(material.id);
  res.json({ message: 'Deleted' });
});

// GET /api/classrooms/:id/materials
router.get('/:id/materials', requireAuth, (req: AuthRequest, res: Response): void => {
  const weekNumber = req.query.week ? parseInt(req.query.week as string, 10) : undefined;
  let rows: any[];
  if (weekNumber !== undefined) {
    rows = db.prepare('SELECT * FROM course_materials WHERE classroom_id = ? AND week_number = ? ORDER BY uploaded_at DESC').all(req.params.id, weekNumber);
  } else {
    rows = db.prepare('SELECT * FROM course_materials WHERE classroom_id = ? ORDER BY week_number, uploaded_at DESC').all(req.params.id);
  }

  // Also get the list of weeks that have AI assistants
  const weeks = db.prepare('SELECT DISTINCT week_number FROM ai_assistants WHERE classroom_id = ? ORDER BY week_number').all(req.params.id) as any[];

  res.json({
    materials: rows.map(r => ({
      id: r.id,
      originalName: r.original_name,
      fileType: r.file_type,
      weekNumber: r.week_number,
      uploadedAt: r.uploaded_at,
    })),
    weeksWithAI: weeks.map(w => w.week_number),
  });
});

export default router;
