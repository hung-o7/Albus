import apiClient from './apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export const chatService = {
  async sendMessage(classroomId: string, message: string, weekNumber: number): Promise<{ reply: string }> {
    const res = await apiClient.post(`/classrooms/${classroomId}/chat`, { message, weekNumber });
    return res.data;
  },

  async getHistory(classroomId: string, weekNumber: number): Promise<{ messages: ChatMessage[] }> {
    const res = await apiClient.get(`/classrooms/${classroomId}/chat/history`, { params: { week: weekNumber } });
    return res.data;
  },

  async getStudentChats(classroomId: string, weekNumber: number): Promise<{
    chats: Array<{
      student: { id: string; firstName: string; lastName: string; email: string };
      messages: ChatMessage[];
    }>;
  }> {
    const res = await apiClient.get(`/classrooms/${classroomId}/chat/students`, { params: { week: weekNumber } });
    return res.data;
  },
};
