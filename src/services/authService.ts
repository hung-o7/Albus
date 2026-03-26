import apiClient from './apiClient';
import { mockAuthService } from './mockData';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '@/types';

const AUTH_ENDPOINT = '/auth';
const USE_MOCK = import.meta.env.VITE_MOCK === 'true';

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    if (USE_MOCK) return mockAuthService.login(data);
    const response = await apiClient.post<AuthResponse>(
      `${AUTH_ENDPOINT}/login`,
      data
    );
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    if (USE_MOCK) return mockAuthService.register(data);
    const response = await apiClient.post<AuthResponse>(
      `${AUTH_ENDPOINT}/register`,
      data
    );
    return response.data;
  },

  async me(): Promise<AuthResponse['user']> {
    const response = await apiClient.get(`${AUTH_ENDPOINT}/me`);
    return response.data;
  },

  async updateProfile(bio: string): Promise<AuthResponse['user']> {
    const response = await apiClient.patch(`${AUTH_ENDPOINT}/profile`, { bio });
    return response.data;
  },

  logout(): void {
    if (USE_MOCK) return mockAuthService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
