import React, { useState, useEffect } from 'react';
import { Typography, Card } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import AuditoriaTable, { type AuditLog } from '../components/AuditoriaTable';
import { auditoriaService } from '../api/auditoria.service';

const { Title } = Typography;

const AuditoriaPage: React.FC = () => {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 50,
    total: 0, 
  });

  const fetchHistorial = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      
      const data = await auditoriaService.getHistorial(skip, pageSize)
      
      setData(data);
      setPagination({
        ...pagination,
        current: page,
        pageSize: pageSize,
      });
    } catch (error) {
      console.error('Error al cargar el historial:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial(pagination.current || 1, pagination.pageSize || 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchHistorial(newPagination.current || 1, newPagination.pageSize || 50);
  };

  return (
    <div style={{ padding: '24px', width: '100%' }}>
      <Card title={<Title level={4} style={{ margin: 0 }}>Historial de Movimientos</Title>} bordered={false}>
        <AuditoriaTable 
          data={data} 
          loading={loading} 
          pagination={pagination} 
          onChange={handleTableChange} 
        />
      </Card>
    </div>
  );
};

export default AuditoriaPage;