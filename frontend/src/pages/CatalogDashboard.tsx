import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Empty, Button, Space, Typography, Tooltip, Modal, Form, List, Avatar } from 'antd';
import {
  BoxPlotOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  BlockOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { useCatalogos, useCreateCatalogo } from '../hooks/useCatalogos';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { CatalogForm } from '../forms/CatalogForm';

const { Title, Text } = Typography;

export const CatalogoDashboard = () => {
  const { data: catalogos, isLoading } = useCatalogos();
  const { mutate: createCatalogo, isPending } = useCreateCatalogo();
  const navigate = useNavigate();

  // Estado para el modal de creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  if (isLoading) return null;

  const hasCatalogos = catalogos && catalogos.length > 0;

  const handleCreate = (values: any) => {
    createCatalogo(values, {
      onSuccess: () => {
        setIsModalOpen(false);
        form.resetFields();
      }
    });
  };

  return (
    <div style={{ padding: '24px', width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden"}}>
      {/* HEADER DINÁMICO */}
      <div style={{ marginBottom: '24px', flex: "none" }}>
        <Title level={2} style={{ margin: 0 }}>Resumen de Catálogos</Title>
      </div>

      {/* ESTADÍSTICAS RÁPIDAS */}
      <div style={{ flex: "none" }}>
        <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic
                title="Total de Catálogos"
                value={catalogos?.length || 0}
                prefix={<BoxPlotOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic
                title="Items Totales (Estimado)"
                value={catalogos?.length ? catalogos.length * 12 : 0} // Placeholder lógico
                prefix={<BlockOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Statistic
                title="Última Actividad"
                value={hasCatalogos ? "Hoy" : "N/A"}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* CONTENIDO PRINCIPAL: LISTA EN LUGAR DE GRID */}
      <div style={{ flex: "1", overflowY: "auto"}}>
        {!hasCatalogos ? (
          <div style={{ padding: '100px 0', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px dashed #d9d9d9' }}>
            <Empty description="No hay catálogos creados todavía.">
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                Crear mi primer catálogo
              </Button>
            </Empty>
          </div>
        ) : (
          <List
            dataSource={catalogos}
            renderItem={(cat) => (
              <Card
                hoverable
                style={{ marginBottom: 12, width: '100%' }}
                bodyStyle={{ padding: '16px 24px' }}
              >
                <Row align="middle" gutter={24}>
                  {/* Icono/Avatar representativo */}
                  <Col flex="none">
                    <Avatar
                      size={48}
                      icon={<FolderOutlined />}
                      style={{ backgroundColor: '#e6f4ff', color: '#1677ff' }}
                    />
                  </Col>

                  {/* Información Principal */}
                  <Col flex="auto">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Text strong style={{ fontSize: '16px' }}>{cat.nombre}</Text>
                      <Text type="secondary" ellipsis={{ tooltip: cat.descripcion }} style={{ maxWidth: '600px' }}>
                        {cat.descripcion || "Sin descripción disponible."}
                      </Text>
                    </div>
                  </Col>

                  {/* Metadatos (Placeholder) */}
                  <Col flex="none" style={{ minWidth: '150px' }}>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <CalendarOutlined /> Creado: {dayjs(cat.creado_en).format('DD/MM/YYYY')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <CalendarOutlined /> Editado: {dayjs(cat.actualizado_en).format('DD/MM/YYYY')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        <BlockOutlined /> 12 artículos (placeholder)
                      </Text>
                    </Space>
                  </Col>

                  {/* Acciones */}
                  <Col flex="none">
                    <Space>
                      <Tooltip title="Ver detalles">
                        <Button
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/dashboard/catalogos/${cat.id}`)}
                        />
                      </Tooltip>
                      <Tooltip title="Editar">
                        <Button type="text" icon={<EditOutlined />} />
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}
          />
        )}
      </div>

      {/* MODAL DE CREACIÓN REUTILIZADO */}
      <Modal
        title="Nuevo Catálogo"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={isPending}
        onOk={() => form.submit()}
        okText="Crear Catálogo"
        destroyOnClose
      >
        <CatalogForm form={form} onFinish={handleCreate} />
      </Modal>
    </div>
  );
};

export default CatalogoDashboard;