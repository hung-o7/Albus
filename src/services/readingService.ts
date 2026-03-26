import apiClient from './apiClient';
import { ReadingAssignment, ReadingAttempt } from '@/types';

export const readingService = {
  async getSpeechToken(): Promise<{ token: string; region: string }> {
    const res = await apiClient.get('/auth/speech-token');
    return res.data;
  },

  async getAssignments(classroomId: string): Promise<{ readingEnabled: boolean; assignments: ReadingAssignment[] }> {
    const res = await apiClient.get(`/classrooms/${classroomId}/reading`);
    return res.data;
  },

  async createAssignment(classroomId: string, title: string, passageText: string): Promise<ReadingAssignment> {
    const res = await apiClient.post(`/classrooms/${classroomId}/reading`, { title, passageText });
    return res.data;
  },

  async deleteAssignment(classroomId: string, assignmentId: string): Promise<void> {
    await apiClient.delete(`/classrooms/${classroomId}/reading/${assignmentId}`);
  },

  async submitAttempt(classroomId: string, assignmentId: string, scores: {
    accuracyScore: number; fluencyScore: number; prosodyScore: number;
    pronunciationScore: number; wordDetails: any[];
  }): Promise<void> {
    await apiClient.post(`/classrooms/${classroomId}/reading/${assignmentId}/attempts`, scores);
  },

  async getMyAttempts(classroomId: string, assignmentId: string): Promise<{ attempts: ReadingAttempt[] }> {
    const res = await apiClient.get(`/classrooms/${classroomId}/reading/${assignmentId}/attempts`);
    return res.data;
  },

  async getStudentAttempts(classroomId: string, assignmentId: string): Promise<{
    studentAttempts: Array<{
      student: { id: string; firstName: string; lastName: string };
      attempts: ReadingAttempt[];
    }>;
  }> {
    const res = await apiClient.get(`/classrooms/${classroomId}/reading/${assignmentId}/attempts`);
    return res.data;
  },
};
