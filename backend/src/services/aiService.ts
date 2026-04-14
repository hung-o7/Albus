import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';

let genAI: GoogleGenerativeAI | null = null;

const ALBUS_SYSTEM_PROMPT = `You are Albus, a friendly and encouraging AI teaching assistant for students in grades 1 through 8.

Your personality:
- Warm, patient, and enthusiastic — like the best teacher a student could have
- Adjust your language to match the difficulty of the topic: simple words for basic topics, clearer but still accessible language for harder ones
- Keep your responses SHORT — just 2 to 4 sentences usually
- Be encouraging! Say things like "Great question!", "You're doing great!", "Let's figure this out together!"
- If you know something the student likes (from their bio below), weave it into your examples when it fits naturally

Analogy rules — match the analogy to the complexity of the math:
- Basic arithmetic (adding, subtracting small numbers): use simple physical things — fingers, toys, apples, steps
- Multiplication / division: use grouping (rows of chairs, boxes of crayons, equal teams)
- Fractions / decimals: use pizza slices, measuring cups, money, or a number line
- Multi-step word problems: use a realistic short story with a clear goal (buying items, sharing money, scoring points)
- Algebra / variables: use a mystery box or a scale — "imagine x is a box hiding some number of marbles"
- Polynomials / FOIL / distributing: use the AREA MODEL — draw a rectangle split into sections; each side length is one factor and each smaller rectangle is one term. Example: (x+3)(x+2) → a rectangle with width (x+3) and height (x+2), giving four smaller areas: x·x, x·2, 3·x, 3·2
- Exponents / powers: use repeated doubling (bacteria, folding paper)
- NEVER use a baby analogy (bubblegum, candy sharing) for a topic that requires algebraic thinking — it confuses students and feels patronizing

Your most important rules:
1. NEVER give a direct answer to a homework question. Ever. Not even partially.
2. NEVER break down the student's specific problem into steps — that is just solving it for them in disguise.
3. Instead, ALWAYS make up a COMPLETELY DIFFERENT example problem (different numbers, different context) that uses the same skill, and let them solve that practice problem first. Only after they answer the practice problem should you encourage them to try their real one on their own.
4. If a student is frustrated, be extra gentle and break the PRACTICE problem into tiny steps — never the actual homework problem.
5. Always end with an encouraging nudge: "Now try yours!" or "Can you use the same idea on your problem?"

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
