import api from './client';

export interface HeroSection {
  badge: string;
  title: string;
  title_highlight: string;
  subtitle: string;
  cta_primary_text: string;
  cta_primary_link: string;
  cta_secondary_text: string;
  cta_secondary_link: string;
  stat_1_val: string;
  stat_1_label: string;
  stat_2_val: string;
  stat_2_label: string;
  stat_3_val: string;
  stat_3_label: string;
  stat_4_val: string;
  stat_4_label: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  badge?: string;
  category: string;
  enabled: boolean;
}

export interface SpecialtyItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  enabled: boolean;
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  stat: string;
  stat_label: string;
}

export interface TestimonialItem {
  id: string;
  author: string;
  role: string;
  clinic: string;
  avatar_url?: string;
  rating: number;
  content: string;
  enabled: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  enabled: boolean;
}

export interface ClientItem {
  id: string;
  name: string;
  category: string;
  logo_url?: string;
  description?: string;
  rating?: number;
  enabled: boolean;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
}

export interface ContactInfo {
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  schedule: string;
  social: SocialLinks;
}

export interface CtaBanner {
  badge: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
}

export interface LandingContent {
  hero: HeroSection;
  features: FeatureItem[];
  specialties: SpecialtyItem[];
  benefits: BenefitItem[];
  testimonials: TestimonialItem[];
  faqs: FaqItem[];
  clients?: ClientItem[];
  contact: ContactInfo;
  cta_banner: CtaBanner;
  is_active: boolean;
}

export interface ContactMessagePayload {
  nombre: string;
  email: string;
  telefono?: string;
  institucion?: string;
  mensaje: string;
}

export interface ContactMessageItem {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  institucion?: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

export const landingApi = {
  getLandingContent: async (): Promise<LandingContent> => {
    const response = await api.get<LandingContent>('/landing');
    return response.data;
  },

  updateLandingContent: async (data: LandingContent): Promise<LandingContent> => {
    const response = await api.put<LandingContent>('/landing', data);
    return response.data;
  },

  resetLandingContent: async (): Promise<LandingContent> => {
    const response = await api.post<LandingContent>('/landing/reset');
    return response.data;
  },

  sendContactMessage: async (payload: ContactMessagePayload): Promise<{ status: string; message: string; id: number }> => {
    const response = await api.post('/landing/contacto', payload);
    return response.data;
  },

  getContactMessages: async (): Promise<ContactMessageItem[]> => {
    const response = await api.get<ContactMessageItem[]>('/landing/mensajes');
    return response.data;
  },

  toggleMessageRead: async (mensajeId: number): Promise<{ status: string; leido: boolean }> => {
    const response = await api.patch(`/landing/mensajes/${mensajeId}/leido`);
    return response.data;
  },
};
