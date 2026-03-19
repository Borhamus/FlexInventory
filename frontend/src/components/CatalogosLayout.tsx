import { useCatalogos } from "../hooks/useCatalogos";
import GenericContextLayout from "./GenericContextLayout";

export const CatalogLayout = () => {
  const { data, isLoading } = useCatalogos(); // Un hook similar
  return (
    <GenericContextLayout 
      title="CATÁLOGOS"
      items={data}
      isLoading={isLoading}
      basePath="/dashboard/catalogos"
      onAddClick={() => console.log("Crear Catálogo")}
    />
  );
};