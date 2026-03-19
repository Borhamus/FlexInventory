import { useInventories } from "../hooks/useInventory";
import GenericContextLayout from "./GenericContextLayout";

export const InventoryLayout = () => {
  const { data, isLoading } = useInventories();
  return (
    <GenericContextLayout 
      title="INVENTARIOS"
      items={data}
      isLoading={isLoading}
      basePath="/dashboard/inventario"
      onAddClick={() => console.log("Crear Inventario")}
    />
  );
};