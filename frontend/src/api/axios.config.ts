import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// NUEVO: Interceptor de respuesta para manejar el 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 1. Limpiamos el token del storage
      localStorage.removeItem('token');
      
      // 2. Redireccionamos al login de forma "bruta" 
      // (ya que aquí no tenemos acceso al navigate de React Router)
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;