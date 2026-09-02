import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { planesApi } from '../api/planes';
import type { SuscripcionEmpresa } from '../types';

export const usePlanFeature = () => {
  const { user } = useAuth();
  const [suscripcion, setSuscripcion] = useState<SuscripcionEmpresa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSuscripcion = async () => {
    try {
      setLoading(true);
      const data = await planesApi.getMiSuscripcion();
      setSuscripcion(data);
    } catch (err) {
      console.warn('No se pudo cargar la información de suscripción:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuscripcion();
    }
  }, [user?.empresa_id]);

  const canAccessModule = (moduleKey: string): boolean => {
    if (user?.es_superadmin) return true;
    if (!suscripcion) return true;
    return suscripcion.modulos_permitidos.includes(moduleKey);
  };

  const isLimitReached = (metric: 'usuarios' | 'sucursales' | 'whatsapp'): boolean => {
    if (user?.es_superadmin) return false;
    if (!suscripcion) return false;

    if (metric === 'usuarios') {
      return suscripcion.metricas.usuarios_usados >= suscripcion.metricas.max_usuarios;
    }
    if (metric === 'sucursales') {
      return suscripcion.metricas.sucursales_usadas >= suscripcion.metricas.max_sucursales;
    }
    if (metric === 'whatsapp') {
      return suscripcion.metricas.mensajes_whatsapp_mes >= suscripcion.metricas.max_mensajes_whatsapp;
    }

    return false;
  };

  return {
    suscripcion,
    loading,
    canAccessModule,
    isLimitReached,
    refreshSuscripcion: fetchSuscripcion
  };
};

