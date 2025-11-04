import React, { useState } from "react";
import DynamicForm from "../components/DynamicForm";

function CatalogNewCatalogForm() {

  const [formData, setFormData] = useState({});
  const handleChange = (name, value) => {
    setFormData({...formData, [name]:value})
  }
  const fields = [
    {
      label: "Nombre del Catalogo",
      name: "catalogo-nombre",
      type: "text",
      placeholder: "Nombre del Catalogo..."
    },
    {
      label: "Descripcion",
      name: "catalogo-descripcion",
      type: "text",
      placeholder: "Descripcion..."
    },
    {
      label: "Fecha de Revision",
      name: "catalogo-revision",
      type: "date",
    },
  ]

return (
    <div>
      <h2>Crear Nuevo Catalogo</h2>
      <DynamicForm
        fields={fields}
        values={formData}
        onChange={handleChange}
      /> 
    </div>
  );  
}
export default CatalogNewCatalogForm;