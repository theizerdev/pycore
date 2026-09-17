import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar Token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pycore_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta para manejar sesión expirada
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      const isPublicPath =
        currentPath === '/' ||
        currentPath === '/landing' ||
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/register') ||
        currentPath.startsWith('/verify-whatsapp') ||
        currentPath.startsWith('/forgot-password') ||
        currentPath.startsWith('/preconsulta') ||
        currentPath.startsWith('/turnero');

      const hadToken = !!localStorage.getItem('pycore_token');

      // Limpiar datos de autenticación del storage
      localStorage.removeItem('pycore_token');
      localStorage.removeItem('pycore_user');
      localStorage.removeItem('pycore_permissions');
      localStorage.removeItem('pycore_sucursal');

      // Solo redirigir si el usuario estaba navegando en una ruta protegida con sesión previa
      if (!isPublicPath && hadToken) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
