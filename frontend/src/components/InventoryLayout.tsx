import { useState } from 'react';
import { useInventories } from "../hooks/useInventory";
import GenericContextLayout from "./GenericContextLayout";
import { ModalAddInventory } from "./ModalAddInventory";
import { useAuthContext } from '../context/AuthContext';

export const InventoryLayout = () => {
  const { data, isLoading } = useInventories();
  const { hasPermission, isTenant } = useAuthContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canCreate = isTenant || hasPermission('inventarios', 'create');

  return (
    <>
      <GenericContextLayout
        title="INVENTARIOS"
        items={data}
        isLoading={isLoading}
        basePath="/dashboard/inventario"
        onAddClick={canCreate ? () => setIsCreateModalOpen(true) : undefined}
        canAdd={canCreate}
      />

      <ModalAddInventory
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};
