import api from './axios.config';

export interface DatabaseStatus {
  drive_connected:     boolean;
  backup_auto_enabled: boolean;
  backup_daily_hour:   number;
  backup_monthly_day:  number;
  drive_file_id:       string | null;
  drive_folder_id:     string | null;
}

export interface BackupConfig {
  backup_auto_enabled: boolean;
  backup_daily_hour:   number;  // 1-168 horas
  backup_monthly_day:  number;  // 1-28
}

// Estado actual de Drive y config de backups
export const getDatabaseStatus = async (): Promise<DatabaseStatus> => {
  const res = await api.get('/database/status');
  return res.data;
};

// URL de autorización de Google OAuth2
export const getOAuthUrl = async (): Promise<string> => {
  const res = await api.get('/database/oauth/url');
  return res.data.url;
};

// Backup manual ahora
export const backupNow = async (): Promise<{ message: string; filename: string }> => {
  const res = await api.post('/database/backup/now');
  return res.data;
};

// Restaurar desde Drive
export const restoreFromDrive = async (): Promise<{ message: string }> => {
  const res = await api.post('/database/restore');
  return res.data;
};

// Eliminar toda la BD del tenant
export const resetDatabase = async (): Promise<{ message: string }> => {
  const res = await api.delete('/database/reset');
  return res.data;
};

// Actualizar config de backups automáticos
export const updateBackupConfig = async (config: BackupConfig): Promise<{ message: string }> => {
  const res = await api.patch('/database/config', config);
  return res.data;
};

// Desconectar Drive
export const disconnectDrive = async (): Promise<{ message: string }> => {
  const res = await api.get('/database/disconnect');
  return res.data;
};
