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
  backup_daily_hour:   number;
  backup_monthly_day:  number;
}

export interface BackupFile {
  file_id:       string;
  name:          string;
  modified_time: string | null;
  size:          string | null;
  is_current:    boolean;
}

export const getDatabaseStatus = async (): Promise<DatabaseStatus> => {
  const res = await api.get('/database/status');
  return res.data;
};

export const getOAuthUrl = async (): Promise<string> => {
  const res = await api.get('/database/oauth/url');
  return res.data.url;
};

export const backupNow = async (): Promise<{ message: string; filename: string }> => {
  const res = await api.post('/database/backup/now');
  return res.data;
};

// Lista todos los backups disponibles en Drive
export const listBackups = async (): Promise<BackupFile[]> => {
  const res = await api.get('/database/backup/list');
  return res.data.backups;
};

// Restaura desde un archivo específico por su file_id
export const restoreFromDriveById = async (fileId: string): Promise<{ message: string }> => {
  const res = await api.post(`/database/restore/${fileId}`);
  return res.data;
};

export const resetDatabase = async (): Promise<{ message: string }> => {
  const res = await api.delete('/database/reset');
  return res.data;
};

export const updateBackupConfig = async (config: BackupConfig): Promise<{ message: string }> => {
  const res = await api.patch('/database/config', config);
  return res.data;
};

export const disconnectDrive = async (): Promise<{ message: string }> => {
  const res = await api.get('/database/disconnect');
  return res.data;
};
