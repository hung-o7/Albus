// ──────────────────────────────────────────────
// Domain types matching the Spring Boot backend
// ──────────────────────────────────────────────

export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string | null;
  createdAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  section?: string;
  subject?: string;
  inviteCode: string;
  bannerColor: string;
  readingEnabled: boolean;
  teacher: User;
  studentCount: number;
  createdAt: string;
}

export interface ReadingAssignment {
  id: string;
  title: string;
  passageText: string;
  createdAt: string;
}

export interface ReadingAttempt {
  id: string;
  accuracyScore: number;
  fluencyScore: number;
  prosodyScore: number;
  pronunciationScore: number;
  wordDetails: Array<{ word: string; accuracyScore: number; errorType: string }>;
  createdAt: string;
}

export interface ClassroomDetail extends Classroom {
  students: User[];
}

// ──────────────────────────────────────────────
// Auth types
// ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ──────────────────────────────────────────────
// Classroom request types
// ──────────────────────────────────────────────

export interface CreateClassroomRequest {
  name: string;
  description: string;
  section?: string;
  subject?: string;
  bannerColor?: string;
  readingEnabled?: boolean;
}

export interface JoinClassroomRequest {
  inviteCode: string;
}

// ──────────────────────────────────────────────
// API response wrapper
// ──────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}

// ──────────────────────────────────────────────
// Course materials & AI types
// ──────────────────────────────────────────────

export interface CourseMaterial {
  id: string;
  originalName: string;
  fileType: string;
  weekNumber: number;
  uploadedAt: string;
}

export interface MaterialsData {
  materials: CourseMaterial[];
  weeksWithAI: number[];
}
