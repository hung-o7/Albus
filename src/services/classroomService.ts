import apiClient from './apiClient';
import { mockClassroomService } from './mockData';
import {
  Classroom,
  ClassroomDetail,
  CreateClassroomRequest,
  JoinClassroomRequest,
} from '@/types';

const CLASSROOM_ENDPOINT = '/classrooms';
const USE_MOCK = import.meta.env.VITE_MOCK === 'true';

export const classroomService = {
  async getMyClassrooms(): Promise<Classroom[]> {
    if (USE_MOCK) return mockClassroomService.getMyClassrooms();
    const response = await apiClient.get<Classroom[]>(CLASSROOM_ENDPOINT);
    return response.data;
  },

  async getClassroom(id: string): Promise<ClassroomDetail> {
    if (USE_MOCK) return mockClassroomService.getClassroom(id);
    const response = await apiClient.get<ClassroomDetail>(
      `${CLASSROOM_ENDPOINT}/${id}`
    );
    return response.data;
  },

  async createClassroom(data: CreateClassroomRequest): Promise<Classroom> {
    if (USE_MOCK) return mockClassroomService.createClassroom(data);
    const response = await apiClient.post<Classroom>(
      CLASSROOM_ENDPOINT,
      data
    );
    return response.data;
  },

  async joinClassroom(data: JoinClassroomRequest): Promise<Classroom> {
    if (USE_MOCK) return mockClassroomService.joinClassroom(data);
    const response = await apiClient.post<Classroom>(
      `${CLASSROOM_ENDPOINT}/join`,
      data
    );
    return response.data;
  },

  async leaveClassroom(id: string): Promise<void> {
    if (USE_MOCK) return mockClassroomService.leaveClassroom(id);
    await apiClient.delete(`${CLASSROOM_ENDPOINT}/${id}/leave`);
  },

  async removeStudent(classroomId: string, studentId: string): Promise<void> {
    if (USE_MOCK) return mockClassroomService.removeStudent(classroomId, studentId);
    await apiClient.delete(
      `${CLASSROOM_ENDPOINT}/${classroomId}/students/${studentId}`
    );
  },
};
