import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import type { AxiosError } from 'axios';
import { authService } from '../api/auth.service';
import type { LoginCredentials } from '../schemas/auth.schema';
import { useAuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const navigate = useNavigate();
  const { setToken } = useAuthContext();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      setToken(data.access_token);
      notification.success({
        message: '¡Bienvenido!',
        description: 'Sesión iniciada correctamente.',
        placement: 'topRight',
      });
      navigate('/dashboard/usuarios');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
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