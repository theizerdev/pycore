import api from './client';
import type { TokenResponse, LoginCredentials, Usuario } from '../types';

export interface RegisterPublicData {
  company_name: string;
  nombre_comercial?: string;
  company_document?: string;
  representante_legal: string;
  email: string;
  password: string;
  telefono?: string;
  company_phone?: string;
  pais_id?: number;
  pais_telefono_id?: number;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/auth/login', credentials);
    return res.data;
  },
  registerPublic: async (data: RegisterPublicData): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/auth/register-public', data);
    return res.data;
  },
  forgotPassword: async (email: string): Promise<{ success: boolean; mensaje: string; email?: string; debug_otp_code?: string }> => {
    const res = await api.post<{ success: boolean; mensaje: string; email?: string; debug_otp_code?: string }>('/auth/forgot-password', { email });
    return res.data;
  },
  resetPasswordOTP: async (data: { email: string; otp_code: string; new_password: string }): Promise<{ success: boolean; mensaje: string }> => {
    const res = await api.post<{ success: boolean; mensaje: string }>('/auth/reset-password-otp', data);
    return res.data;
  },
  verifyOtp: async (data: { email: string; otp_code: string }): Promise<{ valid: boolean; mensaje: string }> => {
    const res = await api.post<{ valid: boolean; mensaje: string }>('/auth/verify-otp', data);
    return res.data;
  },
  getProfile: async (): Promise<{ user: Usuario; permisos: string[] }> => {
    const res = await api.get<{ user: Usuario; permisos: string[] }>('/auth/me');
    return res.data;
  },
  changePassword: async (data: { password_actual: string; password_nueva: string }): Promise<{ mensaje: string }> => {
    const res = await api.post<{ mensaje: string }>('/auth/change-password', data);
    return res.data;
  },
  updateProfile: async (data: { nombre: string; apellido: string; telefono?: string }): Promise<any> => {
    const res = await api.put('/auth/perfil', data);
    return res.data;
  },
  verifyWhatsAppOTP: async (code: string): Promise<{ success: boolean; mensaje: string }> => {
    const res = await api.post<{ success: boolean; mensaje: string }>('/auth/verify-whatsapp', { code });
    return res.data;
  },
  resendWhatsAppOTP: async (): Promise<{ success: boolean; mensaje: string; debug_otp_code?: string }> => {
    const res = await api.post<{ success: boolean; mensaje: string; debug_otp_code?: string }>('/auth/resend-whatsapp-otp');
    return res.data;
  }
};

