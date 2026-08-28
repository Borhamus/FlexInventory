import React, { useState, useEffect } from 'react';
import { Typography, Card } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import AuditoriaTable from '../components/AuditoriaTable';
import { auditoriaService, type AuditLog } from '../api/auditoria.service';

const { Title } = Typography;

const AuditoriaPage: React.FC = () => {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // Tamaños de página que el usuario puede elegir con el selector de la
  // tabla (showSizeChanger): 5, 10, 20, y de ahí de 10 en 10 hasta 100 —
  // el mismo techo que el backend acepta por request (app/auditoria/router.py).
  const PAGE_SIZE_OPTIONS = ['5', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100'];
  const DEFAULT_PAGE_SIZE = 10;

  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  const fetchHistorial = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;

      const response = await auditoriaService.getHistorial(skip, pageSize)

      console.log("Datos recibidos:", response.items);
      console.log("Total reportado por backend:", response.total);

      setData(response.items || response);
      setPagination((prev) => ({
        ...prev,
        current: page,
        pageSize: pageSize,
        total: response.total
      }));
    } catch (error) {
      console.error('Error al cargar el historial:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial(1, DEFAULT_PAGE_SIZE);
  }, []);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    // Si el usuario cambia el tamaño de página, "current" que manda antd ya
    // viene recalculado para seguir mostrando aproximadamente los mismos
    // registros — solo hace falta pedirle al backend la página nueva.
    fetchHistorial(newPagination.current || 1, newPagination.pageSize || DEFAULT_PAGE_SIZE);
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
