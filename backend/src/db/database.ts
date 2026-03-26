import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'albus.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Migrations
try { db.exec('ALTER TABLE users ADD COLUMN bio TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE classrooms ADD COLUMN reading_enabled INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS reading_assignments (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL,
    title TEXT NOT NULL,
    passage_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  CREATE TABLE IF NOT EXISTS reading_attempts (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    accuracy_score REAL NOT NULL,
    fluency_score REAL NOT NULL,
    prosody_score REAL NOT NULL,
    pronunciation_score REAL NOT NULL,
    word_details TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (assignment_id) REFERENCES reading_assignments(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('TEACHER', 'STUDENT')),
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    section TEXT,
    subject TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    banner_color TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS classroom_students (
    classroom_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (classroom_id, student_id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS course_materials (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    extracted_text TEXT,
    openai_file_id TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  CREATE TABLE IF NOT EXISTS ai_assistants (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    openai_assistant_id TEXT NOT NULL,
    vector_store_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(classroom_id, week_number),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    classroom_id TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    openai_thread_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, classroom_id, week_number),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (thread_id) REFERENCES chat_threads(id)
  );
`);

export default db;
