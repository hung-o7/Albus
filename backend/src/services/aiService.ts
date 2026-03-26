import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';

let genAI: GoogleGenerativeAI | null = null;

const ALBUS_SYSTEM_PROMPT = `You are Albus, a friendly and encouraging AI teaching assistant for elementary school students in grades 1 through 4.

Your personality:
- Warm, patient, and enthusiastic — like the best teacher a child could have
- Use simple, easy words that a young child can understand
- Keep your responses SHORT — just 2 to 4 sentences usually
- Be very encouraging! Say things like "Great question!", "You're doing great!", "Let's figure this out together!"
- Use fun examples kids relate to: toys, animals, snacks, games. If you know something the student likes (from their bio below), use that in your examples!

Your most important rules:
1. NEVER give a direct answer to a homework question. Ever. Not even partially.
2. NEVER break down the student's specific problem into steps — that is just solving it for them in disguise.
3. Instead, ALWAYS make up a COMPLETELY DIFFERENT example problem (different numbers, different context) that uses the same skill, and let them solve that practice problem first. Only after they answer the practice problem should you encourage them to try their real one on their own.
4. For math: use counting on fingers, grouping objects, or relatable stories with DIFFERENT numbers than the homework (e.g., if they ask about 67-3, practice with something like 45-2 instead).
5. If a student is frustrated, be extra gentle and break the PRACTICE problem into tiny steps — never the actual homework problem.
6. Always end with an encouraging nudge: "Now try yours!" or "Can you use the same idea on your problem?"

You have access to this week's course materials listed below — use them to understand what topics the class is covering, but still never reveal homework answers.`;

function getOrCreateLocalThread(studentId: string, classroomId: string, weekNumber: number): string {
  const existing = db.prepare(
    'SELECT id FROM chat_threads WHERE student_id = ? AND classroom_id = ? AND week_number = ?'
  ).get(studentId, classroomId, weekNumber) as any;

  if (existing) return existing.id;

  const threadId = uuidv4();
  // openai_thread_id column repurposed as a local ID (no OpenAI thread needed)
  db.prepare(
    'INSERT INTO chat_threads (id, student_id, classroom_id, week_number, openai_thread_id) VALUES (?, ?, ?, ?, ?)'
  ).run(threadId, studentId, classroomId, weekNumber, threadId);

  return threadId;
}

export async function chat(
  studentId: string,
  classroomId: string,
  weekNumber: number,
  message: string,
  _classroomName: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in backend/.env');
  }
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // Load student bio for personalized examples
  const studentRow = db.prepare('SELECT bio FROM users WHERE id = ?').get(studentId) as any;
  const bioContext = studentRow?.bio?.trim()
    ? `\n\nAbout this student (use their interests to make examples more fun and relatable): ${studentRow.bio.trim()}`
    : '';

  // Load course materials for context
  const materials = db.prepare(
    "SELECT extracted_text, original_name FROM course_materials WHERE classroom_id = ? AND week_number = ? AND extracted_text IS NOT NULL AND TRIM(extracted_text) != ''"
  ).all(classroomId, weekNumber) as any[];

  const materialsContext = materials.length > 0
    ? '\n\nCourse materials for this week:\n' +
      materials.map(m => `--- ${m.original_name} ---\n${m.extracted_text}`).join('\n\n')
    : '\n\n(No course materials have been uploaded for this week yet.)';

  // Load chat history for this student+classroom+week
  const threadId = getOrCreateLocalThread(studentId, classroomId, weekNumber);
  const historyRows = db.prepare(
    'SELECT role, content FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC'
  ).all(threadId) as any[];

  // Build Gemini history (all but the current message)
  const history: Content[] = historyRows.map(row => ({
    role: row.role === 'user' ? 'user' : 'model',
    parts: [{ text: row.content }],
  }));

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction: ALBUS_SYSTEM_PROMPT + bioContext + materialsContext,
  });

  const chatSession = model.startChat({ history });
  const result = await chatSession.sendMessage(message);
  const reply = result.response.text().trim();

  // Persist both messages
  db.prepare('INSERT INTO chat_messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)').run(uuidv4(), threadId, 'user', message);
  db.prepare('INSERT INTO chat_messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)').run(uuidv4(), threadId, 'assistant', reply);

  return reply;
}
