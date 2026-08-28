import React, { useState, useEffect } from 'react';
import { Typography, Card } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import AuditoriaTable from '../components/AuditoriaTable';
import { auditoriaService, type AuditLog } from '../api/auditoria.service';

const { Title } = Typography;

const AuditoriaPage: React.FC = () => {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 15,
    total: 0, 
  });

  const fetchHistorial = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      
      const response = await auditoriaService.getHistorial(skip, pageSize)
      
      console.log("Datos recibidos:", response.items);
      console.log("Total reportado por backend:", response.total);

      setData(response.items || response);
      setPagination({
        ...pagination,
        current: page,
        pageSize: pageSize,
        total: response.total
      });
    } catch (error) {
      console.error('Error al cargar el historial:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial(pagination.current || 1, pagination.pageSize || 15);
  }, []);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    fetchHistorial(newPagination.current || 1, newPagination.pageSize || 15);
  };

  return (
    // height:100% + overflowY:auto: sin esto el panel de historial quedaba
    // sin forma de scrollear cuando la tabla + paginado eran más altos que
    // la ventana (el documento ya no scrollea, cada panel scrollea solo).
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', width: '100%' }}>
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