import api from './client';
import type {
  Especialidad,
  EspecialidadCreateInput,
  EspecialidadUpdateInput,
  EspecialidadPlantilla,
  EspecialidadPlantillaSaveInput,
  EspecialidadPlantillaMedico,
  PlantillaMedicoSaveInput,
  PlantillaEfectiva,
} from '../types';

export interface EspecialidadesFilterParams {
  sucursal_id?: number | null;
  include_global?: boolean;
  activo?: boolean;
  search?: string;
  empresa_id?: number;
}

export const especialidadesApi = {
  list: async (params?: EspecialidadesFilterParams): Promise<Especialidad[]> => {
    const res = await api.get<Especialidad[]>('/especialidades', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Especialidad> => {
    const res = await api.get<Especialidad>(`/especialidades/${id}`);
    return res.data;
  },

  create: async (data: EspecialidadCreateInput): Promise<Especialidad> => {
    const res = await api.post<Especialidad>('/especialidades', data);
    return res.data;
  },

  update: async (id: number, data: EspecialidadUpdateInput): Promise<Especialidad> => {
    const res = await api.put<Especialidad>(`/especialidades/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/especialidades/${id}`);
    return res.data;
  },

  seedDefaults: async (sucursal_id?: number | null): Promise<Especialidad[]> => {
    const params = sucursal_id ? { sucursal_id } : {};
    const res = await api.post<Especialidad[]>('/especialidades/seed-defaults', null, { params });
    return res.data;
  },

  // ── PLANTILLAS CLÍNICAS Y PERSONALIZACIÓN DE MÉDICOS ──
  getPlantilla: async (especialidadId: number): Promise<EspecialidadPlantilla> => {
    const res = await api.get<EspecialidadPlantilla>(`/especialidades/${especialidadId}/plantilla`);
    return res.data;
  },

  savePlantilla: async (
    especialidadId: number,
    data: EspecialidadPlantillaSaveInput
  ): Promise<EspecialidadPlantilla> => {
    const res = await api.put<EspecialidadPlantilla>(
      `/especialidades/${especialidadId}/plantilla`,
      data
    );
    return res.data;
  },

  seedDefaultPlantilla: async (especialidadId: number): Promise<EspecialidadPlantilla> => {
    const res = await api.post<EspecialidadPlantilla>(
      `/especialidades/${especialidadId}/plantilla/seed-defaults`
    );
    return res.data;
  },

  getPlantillaMedico: async (especialidadId: number): Promise<EspecialidadPlantillaMedico> => {
    const res = await api.get<EspecialidadPlantillaMedico>(
      `/especialidades/${especialidadId}/plantilla/medico`
    );
    return res.data;
  },

  savePlantillaMedico: async (
    especialidadId: number,
    data: PlantillaMedicoSaveInput
  ): Promise<EspecialidadPlantillaMedico> => {
    const res = await api.put<EspecialidadPlantillaMedico>(
      `/especialidades/${especialidadId}/plantilla/medico`,
      data
    );
    return res.data;
  },

  getPlantillaEfectiva: async (especialidadId: number): Promise<PlantillaEfectiva> => {
    const res = await api.get<PlantillaEfectiva>(
      `/especialidades/${especialidadId}/plantilla/efectiva`
    );
    return res.data;
  },
};
