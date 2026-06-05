import React, { useEffect, useState } from 'react';
import {
  Card, Button, Switch, InputNumber, Typography, Divider,
  Alert, Modal, Tag, Spin, Row, Col, Tooltip, notification,
  List, Radio, Space,
} from 'antd';
import {
  CloudUploadOutlined, CloudDownloadOutlined, DeleteOutlined,
  LinkOutlined, DisconnectOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ReloadOutlined, WarningOutlined,
  FileOutlined, StarOutlined,
} from '@ant-design/icons';
import {
  getDatabaseStatus, getOAuthUrl, backupNow, listBackups,
  restoreFromDriveById, resetDatabase, updateBackupConfig, disconnectDrive,
  type DatabaseStatus, type BackupFile,
} from '../api/database.service';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

// Formatea "2026-06-04T07:40:49.000Z" → "04/06/2026 07:40"
function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Formatea bytes → "1.2 MB"
function formatSize(bytes: string | null): string {
  if (!bytes) return '—';
  const n = parseInt(bytes, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const DatabasePage: React.FC = () => {
  const { isTenant } = useAuthContext();
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();

  const [status,        setStatus]        = useState<DatabaseStatus | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dailyHour,     setDailyHour]     = useState<number>(24);
  const [monthlyDay,    setMonthlyDay]    = useState<number>(1);
  const [autoEnabled,   setAutoEnabled]   = useState(false);
  const [api,           contextHolder]    = notification.useNotification();

  // ── Estado del modal de restauración ──────────────────────────────────
  const [restoreModalOpen,  setRestoreModalOpen]  = useState(false);
  const [backupList,        setBackupList]        = useState<BackupFile[]>([]);
  const [loadingBackups,    setLoadingBackups]    = useState(false);
  const [selectedFileId,    setSelectedFileId]    = useState<string | null>(null);

  useEffect(() => {
    if (!isTenant) navigate('/dashboard', { replace: true });
  }, [isTenant]);

  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      api.success({ message: 'Google Drive conectado correctamente.' });
      fetchStatus();
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const s = await getDatabaseStatus();
      setStatus(s);
      setAutoEnabled(s.backup_auto_enabled);
      setDailyHour(s.backup_daily_hour);
      setMonthlyDay(s.backup_monthly_day);
    } catch {
      api.error({ message: 'No se pudo cargar el estado de la base de datos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  // ── Abrir modal de restauración y cargar lista ─────────────────────────
  const handleOpenRestoreModal = async () => {
    setSelectedFileId(null);
    setRestoreModalOpen(true);
    setLoadingBackups(true);
    try {
      const list = await listBackups();
      setBackupList(list);
      if (list.length > 0) setSelectedFileId(list[0].file_id);
    } catch (e: any) {
      api.error({ message: 'No se pudieron cargar los backups', description: e?.response?.data?.detail });
      setRestoreModalOpen(false);
    } finally {
      setLoadingBackups(false);
    }
  };

  // ── Confirmar restauración ─────────────────────────────────────────────
  const handleConfirmRestore = async () => {
    if (!selectedFileId) return;
    setActionLoading('restore');
    try {
      const res = await restoreFromDriveById(selectedFileId);
      api.success({ message: res.message });
      setRestoreModalOpen(false);
    } catch (e: any) {
      api.error({ message: 'Error restaurando', description: e?.response?.data?.detail });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectDrive = async () => {
    try {
      const url = await getOAuthUrl();
      window.location.href = url;
    } catch {
      api.error({ message: 'No se pudo generar el link de autorización de Google.' });
    }
  };

  const handleDisconnect = () => {
    Modal.confirm({
      title:   '¿Desconectar Google Drive?',
      content: 'Se eliminarán los tokens de acceso. Los backups automáticos se desactivarán. Los archivos en tu Drive no se borran.',
      okText:  'Desconectar',
      okButtonProps: { danger: true },
      onOk: async () => {
        setActionLoading('disconnect');
        try {
          await disconnectDrive();
          api.success({ message: 'Google Drive desconectado.' });
          fetchStatus();
        } catch {
          api.error({ message: 'Error al desconectar.' });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleBackupNow = async () => {
    setActionLoading('backup');
    try {
      const res = await backupNow();
      api.success({ message: 'Backup completado', description: `Archivo: ${res.filename}` });
      fetchStatus();
    } catch (e: any) {
      api.error({ message: 'Error en el backup', description: e?.response?.data?.detail });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title:   '⚠️ ¿Eliminar toda la base de datos?',
      icon:    <WarningOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <Paragraph>Esta acción eliminará permanentemente:</Paragraph>
          <ul>
            <li>Todos los inventarios y sus items</li>
            <li>Todos los catálogos</li>
            <li>Todos los empleados y sus roles</li>
          </ul>
          <Paragraph strong>Tu cuenta de administrador NO se elimina. Esta acción es IRREVERSIBLE.</Paragraph>
        </div>
      ),
      okText:  'Eliminar todo',
      okButtonProps: { danger: true },
      onOk: async () => {
        setActionLoading('reset');
        try {
          const res = await resetDatabase();
          api.success({ message: res.message });
        } catch (e: any) {
          api.error({ message: 'Error eliminando', description: e?.response?.data?.detail });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleSaveConfig = async () => {
    setActionLoading('config');
    try {
      const res = await updateBackupConfig({
        backup_auto_enabled: autoEnabled,
        backup_daily_hour:   dailyHour,
        backup_monthly_day:  monthlyDay,
      });
      api.success({ message: res.message });
      fetchStatus();
    } catch (e: any) {
      api.error({ message: 'Error guardando configuración', description: e?.response?.data?.detail });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  const driveConnected = status?.drive_connected ?? false;

  return (
    <div style={{ padding: '32px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
      {contextHolder}

      <Title level={3} style={{ marginBottom: 4 }}>Base de Datos</Title>
      <Text type="secondary">Gestión de backups y almacenamiento en Google Drive</Text>

      <Divider />

      {/* ── Estado de conexión ── */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong style={{ fontSize: 16 }}>Google Drive</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Los backups se guardan en la carpeta <Text code>FlexInventory Storage</Text> de tu Drive.
            </Text>
          </Col>
          <Col>
            {driveConnected ? (
              <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 13, padding: '4px 12px' }}>
                Conectado
              </Tag>
            ) : (
              <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 13, padding: '4px 12px' }}>
                Sin conectar
              </Tag>
            )}
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={12}>
          {!driveConnected ? (
            <Col>
              <Button type="primary" icon={<LinkOutlined />} onClick={handleConnectDrive}>
                Conectar con Google Drive
              </Button>
            </Col>
          ) : (
            <Col>
              <Button danger icon={<DisconnectOutlined />} onClick={handleDisconnect} loading={actionLoading === 'disconnect'}>
                Desconectar Drive
              </Button>
            </Col>
          )}
          <Col>
            <Tooltip title="Actualizar estado">
              <Button icon={<ReloadOutlined />} onClick={fetchStatus} />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* ── Acciones de backup ── */}
      <Card title="Acciones" style={{ marginBottom: 24 }}>
        {!driveConnected && (
          <Alert message="Conectá tu Google Drive para habilitar los backups." type="warning" showIcon style={{ marginBottom: 16 }} />
        )}

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Button
              block type="primary" icon={<CloudUploadOutlined />}
              onClick={handleBackupNow} disabled={!driveConnected}
              loading={actionLoading === 'backup'} style={{ height: 56 }}
            >
              Backup ahora
            </Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}>
              Sube un snapshot completo a Drive
            </Text>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              block icon={<CloudDownloadOutlined />}
              onClick={handleOpenRestoreModal}
              disabled={!driveConnected || !status?.drive_file_id}
              loading={actionLoading === 'restore'} style={{ height: 56 }}
            >
              Restaurar desde Drive
            </Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}>
              Elegí un backup para restaurar
            </Text>
          </Col>

          <Col xs={24} sm={8}>
            <Button
              block danger icon={<DeleteOutlined />}
              onClick={handleReset} loading={actionLoading === 'reset'} style={{ height: 56 }}
            >
              Eliminar base de datos
            </Button>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', textAlign: 'center', marginTop: 4 }}>
              Borra todos los datos del tenant
            </Text>
          </Col>
        </Row>
      </Card>

      {/* ── Configuración de backups automáticos ── */}
      <Card title="Backups automáticos">
        <Row align="middle" style={{ marginBottom: 20 }}>
          <Col flex="auto">
            <Text strong>Activar backups automáticos</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Se ejecutan en segundo plano mientras el servidor esté activo.
            </Text>
          </Col>
          <Col>
            <Switch checked={autoEnabled} onChange={setAutoEnabled} disabled={!driveConnected} />
          </Col>
        </Row>

        <Row gutter={24} style={{ marginBottom: 20, opacity: autoEnabled ? 1 : 0.4 }}>
          <Col xs={24} sm={12}>
            <Text strong>Frecuencia del backup diario</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Cada cuántas horas (1–168)</Text>
            <br />
            <InputNumber
              min={1} max={168} value={dailyHour}
              onChange={(v) => setDailyHour(v ?? 24)}
              disabled={!autoEnabled} addonAfter="horas"
              style={{ marginTop: 8, width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text strong>Día del backup mensual</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Día del mes (1–28), a las 03:00 UTC</Text>
            <br />
            <InputNumber
              min={1} max={28} value={monthlyDay}
              onChange={(v) => setMonthlyDay(v ?? 1)}
              disabled={!autoEnabled} addonAfter="del mes"
              style={{ marginTop: 8, width: '100%' }}
            />
          </Col>
        </Row>

        <Button type="primary" onClick={handleSaveConfig} loading={actionLoading === 'config'} disabled={!driveConnected}>
          Guardar configuración
        </Button>
      </Card>

      {/* ══ Modal de selección de backup ══════════════════════════════════ */}
      <Modal
        title="Restaurar base de datos"
        open={restoreModalOpen}
        onCancel={() => setRestoreModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRestoreModalOpen(false)}>
            Cancelar
          </Button>,
          <Button
            key="confirm"
            danger
            type="primary"
            disabled={!selectedFileId}
            loading={actionLoading === 'restore'}
            onClick={handleConfirmRestore}
          >
            Restaurar
          </Button>,
        ]}
        width={560}
      >
        <Alert
          icon={<WarningOutlined />}
          message="¿Restaurar base de datos?"
          description="Esto reemplazará TODOS los datos actuales con el backup seleccionado guardado en Drive. Esta acción es irreversible."
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />

        {loadingBackups ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <br />
            <Text type="secondary" style={{ marginTop: 12, display: 'block' }}>Cargando backups desde Drive...</Text>
          </div>
        ) : backupList.length === 0 ? (
          <Text type="secondary">No se encontraron backups en Drive.</Text>
        ) : (
          <Radio.Group
            value={selectedFileId}
            onChange={(e) => setSelectedFileId(e.target.value)}
            style={{ width: '100%' }}
          >
            <List
              dataSource={backupList}
              renderItem={(item) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    padding: '10px 12px',
                    borderRadius: 8,
                    marginBottom: 6,
                    border: selectedFileId === item.file_id ? '1.5px solid #1677ff' : '1.5px solid #f0f0f0',
                    background: selectedFileId === item.file_id ? '#e6f4ff' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setSelectedFileId(item.file_id)}
                >
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <Radio value={item.file_id} />
                      {item.is_current
                        ? <StarOutlined style={{ color: '#1677ff' }} />
                        : <FileOutlined style={{ color: '#8c8c8c' }} />
                      }
                      <div>
                        <Text strong style={{ color: item.is_current ? '#1677ff' : undefined }}>
                          {item.name}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDate(item.modified_time)}
                        </Text>
                      </div>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatSize(item.size)}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Radio.Group>
        )}
      </Modal>
    </div>
  );
};

export default DatabasePage;
