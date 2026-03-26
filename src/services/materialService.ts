import apiClient from './apiClient';

export interface Material {
  id: string;
  originalName: string;
  fileType: string;
  weekNumber: number;
  uploadedAt: string;
}

export interface MaterialsResponse {
  materials: Material[];
  weeksWithAI: number[];
}

export const materialService = {
  async uploadMaterials(classroomId: string, weekNumber: number, files: File[]): Promise<{ message: string; materials: Material[] }> {
    const formData = new FormData();
    formData.append('weekNumber', String(weekNumber));
    files.forEach(f => formData.append('files', f));
    const res = await apiClient.post(`/classrooms/${classroomId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getMaterials(classroomId: string, week?: number): Promise<MaterialsResponse> {
    const params = week !== undefined ? { week } : {};
    const res = await apiClient.get(`/classrooms/${classroomId}/materials`, { params });
    return res.data;
  },

  async deleteMaterial(classroomId: string, materialId: string): Promise<void> {
    await apiClient.delete(`/classrooms/${classroomId}/materials/${materialId}`);
  },
};
