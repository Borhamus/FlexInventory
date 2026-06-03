import { useState } from 'react';
import { Modal, Form } from 'antd';
import { useCatalogos, useCreateCatalogo } from "../hooks/useCatalogos";
import GenericContextLayout from "./GenericContextLayout";
import { CatalogForm } from '../forms/CatalogForm';
import { useAuthContext } from '../context/AuthContext';

export const CatalogLayout = () => {
  const { data, isLoading } = useCatalogos();
  const { mutate: createCatalogo, isPending } = useCreateCatalogo();
  const { hasPermission, isTenant } = useAuthContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const canCreate = isTenant || hasPermission('catalogos', 'create');

  const handleCreate = (values: any) => {
    createCatalogo(values, {
      onSuccess: () => {
        setIsModalOpen(false);
        form.resetFields();
      }
    });
  };

  return (
    <>
      <GenericContextLayout
        title="CATÁLOGOS"
        items={data}
        isLoading={isLoading}
        basePath="/dashboard/catalogos"
        onAddClick={canCreate ? () => setIsModalOpen(true) : undefined}
        canAdd={canCreate}
      />

      <Modal
        title="Crear Nuevo Catálogo"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={isPending}
        onOk={() => form.submit()}
        okText="Crear"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <CatalogForm form={form} onFinish={handleCreate} />
      </Modal>
    </>
  );
};
