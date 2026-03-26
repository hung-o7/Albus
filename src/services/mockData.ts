/**
 * ── Mock Data Store ──
 * Temporary in-memory backend for frontend development.
 * Remove this entire file once Spring Boot is connected.
 *
 * Admin credentials:
 *   Email:    admin@classroom.dev
 *   Password: admin123
 *
 * Student credentials:
 *   Email:    student@classroom.dev
 *   Password: student123
 */

import {
  User,
  UserRole,
  Classroom,
  ClassroomDetail,
  AuthResponse,
  CreateClassroomRequest,
  JoinClassroomRequest,
  LoginRequest,
  RegisterRequest,
} from '@/types';
import { getRandomBannerColor, generateInviteCode } from '@/utils/helpers';

// ── Seed users ──
const MOCK_TEACHER: User = {
  id: 'usr-teacher-001',
  email: 'admin@classroom.dev',
  firstName: 'Admin',
  lastName: 'Teacher',
  role: UserRole.TEACHER,
  createdAt: new Date().toISOString(),
};

const MOCK_STUDENT: User = {
  id: 'usr-student-001',
  email: 'student@classroom.dev',
  firstName: 'Demo',
  lastName: 'Student',
  role: UserRole.STUDENT,
  createdAt: new Date().toISOString(),
};

// ── In-memory store ──
const users: User[] = [MOCK_TEACHER, MOCK_STUDENT];
const passwords: Record<string, string> = {
  'admin@classroom.dev': 'admin123',
  'student@classroom.dev': 'student123',
};

const classrooms: Classroom[] = [
  {
    id: 'cls-001',
    name: 'Mr. Doan 1st Grade Math Class',
    description: 'McKinley Elementary School - Math Class.',
    section: 'Period 7',
    subject: 'English',
    inviteCode: 'cs101ab',
    bannerColor: '#0d47a1',
    readingEnabled: false,
    teacher: MOCK_TEACHER,
    studentCount: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cls-002',
    name: 'Calculus II',
    description: 'Integration techniques, series, and multivariable calculus.',
    section: 'Period 3',
    subject: 'Mathematics',
    inviteCode: 'math2x',
    bannerColor: '#bf360c',
    readingEnabled: false,
    teacher: MOCK_TEACHER,
    studentCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cls-003',
    name: 'Mr. Dang 2nd Grade English Class',
    description: 'McKinley Elementary School - English Class.',
    section: 'Period 3',
    subject: 'Mathematics',
    inviteCode: 'os352z',
    bannerColor: '#4a148c',
    readingEnabled: false,
    teacher: MOCK_TEACHER,
    studentCount: 1,
    createdAt: new Date().toISOString(),
  },
];

// Track which students are in which classrooms
const enrollments: Record<string, string[]> = {
  'cls-001': ['usr-student-001'],
  'cls-002': [],
  'cls-003': ['usr-student-001'],
};

// ── Helpers ──
let idCounter = 100;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Mock Auth Service ──
export const mockAuthService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    await delay(300);
    const stored = passwords[data.email];
    if (!stored || stored !== data.password) {
      throw new Error('Invalid credentials');
    }
    const user = users.find((u) => u.email === data.email)!;
    return { token: 'mock-jwt-' + user.id, user };
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    await delay(300);
    if (users.some((u) => u.email === data.email)) {
      throw new Error('Email already in use');
    }
    const user: User = {
      id: nextId('usr'),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    passwords[data.email] = data.password;
    return { token: 'mock-jwt-' + user.id, user };
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// ── Mock Classroom Service ──
export const mockClassroomService = {
  async getMyClassrooms(): Promise<Classroom[]> {
    await delay(200);
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (user.role === UserRole.TEACHER) {
      return classrooms.filter((c) => c.teacher.id === user.id);
    }
    // Student: return classrooms they're enrolled in
    return classrooms.filter((c) =>
      enrollments[c.id]?.includes(user.id)
    );
  },

  async getClassroom(id: string): Promise<ClassroomDetail> {
    await delay(200);
    const classroom = classrooms.find((c) => c.id === id);
    if (!classroom) throw new Error('Not found');

    const studentIds = enrollments[id] || [];
    const students = users.filter((u) => studentIds.includes(u.id));

    return { ...classroom, students };
  },

  async createClassroom(data: CreateClassroomRequest): Promise<Classroom> {
    await delay(300);
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const classroom: Classroom = {
      id: nextId('cls'),
      name: data.name,
      description: data.description,
      section: data.section,
      subject: data.subject,
      inviteCode: generateInviteCode(),
      bannerColor: data.bannerColor || getRandomBannerColor(),
      readingEnabled: data.readingEnabled ?? false,
      teacher: user,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    };
    classrooms.push(classroom);
    enrollments[classroom.id] = [];
    return classroom;
  },

  async joinClassroom(data: JoinClassroomRequest): Promise<Classroom> {
    await delay(300);
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const classroom = classrooms.find(
      (c) => c.inviteCode === data.inviteCode
    );
    if (!classroom) throw new Error('Invalid invite code');

    if (enrollments[classroom.id]?.includes(user.id)) {
      throw new Error('Already enrolled');
    }

    if (!enrollments[classroom.id]) enrollments[classroom.id] = [];
    enrollments[classroom.id].push(user.id);
    classroom.studentCount++;
    return classroom;
  },

  async leaveClassroom(id: string): Promise<void> {
    await delay(200);
    const user = getCurrentUser();
    if (!user) return;
    const list = enrollments[id];
    if (list) {
      enrollments[id] = list.filter((uid) => uid !== user.id);
      const cls = classrooms.find((c) => c.id === id);
      if (cls) cls.studentCount--;
    }
  },

  async removeStudent(classroomId: string, studentId: string): Promise<void> {
    await delay(200);
    const list = enrollments[classroomId];
    if (list) {
      enrollments[classroomId] = list.filter((uid) => uid !== studentId);
      const cls = classrooms.find((c) => c.id === classroomId);
      if (cls) cls.studentCount--;
    }
  },
};

// ── Get current user from localStorage ──
function getCurrentUser(): User | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
