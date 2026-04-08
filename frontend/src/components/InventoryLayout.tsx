import { useState } from 'react';
import { useInventories } from "../hooks/useInventory";
import GenericContextLayout from "./GenericContextLayout";
import { ModalAddInventory } from "./ModalAddInventory";

export const InventoryLayout = () => {
  const { data, isLoading } = useInventories();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  return (
    <>
      <GenericContextLayout
        title="INVENTARIOS"
        items={data}
        isLoading={isLoading}
        basePath="/dashboard/inventario"
        // 4. Cambiamos el console.log por el encendido del modal
        onAddClick={() => setIsCreateModalOpen(true)}
      />

      {/* 5. El componente invisible esperando su turno */}
      <ModalAddInventory 
        open={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </>
  );
};