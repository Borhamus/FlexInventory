import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import type { AxiosError } from 'axios';
import { authService } from '../api/auth.service';
import type { LoginCredentials, RegisterTenantData } from '../schemas/auth.schema';
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
      navigate('/dashboard');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      notification.error({
        message: 'Error de autenticación',
        description: error.response?.data?.detail || 'Credenciales incorrectas o servidor caído.',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterTenantData) => authService.registerTenant(data),
    onSuccess: () => {
      notification.success({
        message: '¡Cuenta creada!',
        description: 'Tu cuenta fue creada correctamente. Ahora podés iniciar sesión.',
        placement: 'topRight',
      });
      navigate('/');
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      notification.error({
        message: 'Error al crear la cuenta',
        description: error.response?.data?.detail || 'No se pudo crear la cuenta. Intentá de nuevo.',
      });
    },
  });

  return {
    login: loginMutation.mutate,
    isLoading: loginMutation.isPending,
    error: loginMutation.error,
    registerTenant: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
  };
};