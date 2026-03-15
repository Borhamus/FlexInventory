import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { authService } from '../api/auth.service';
import type { LoginCredentials } from '../schemas/auth.schema';

export const useAuth = () => {
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      // 1. Guardar el token (esto es simplificado, luego podemos usar un Context)
      localStorage.setItem('token', data.access_token);
      
      // 2. Notificación de éxito de Ant Design
      notification.success({
        message: '¡Bienvenido!',
        description: 'Sesión iniciada correctamente.',
        placement: 'topRight',
      });

      // 3. Redirigir a la tabla de usuarios
      navigate('/dashboard/usuarios');
    },
    onError: (error: any) => {
      // 4. Manejo de errores de Ant Design
      notification.error({
        message: 'Error de autenticación',
        description: error.response?.data?.detail || 'Credenciales incorrectas o servidor caído.',
      });
    },
  });

  return {
    login: loginMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
  };
};