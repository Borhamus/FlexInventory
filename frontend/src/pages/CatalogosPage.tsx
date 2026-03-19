import React from 'react';
import {   Card, Table, Tag, Typography } from 'antd';

const { Title } = Typography;

const CatalogosPage: React.FC = () => {

  return (
    <Card>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          CATALOGO TEST YEY
        </Title>
        <Tag color="blue">ID: 1</Tag>
      </div>

      <>AAAAAAAAAAAA</>

    </Card>
  );
};

export default CatalogosPage;