import React, { useState, useEffect} from "react";
import Button from "../components/Button";
import DynamicForm from "../components/DynamicForm";

// 1. DESESTRUCTURAR PROPS (Incluyendo renombrar 'close' a 'onClose')
function CatalogoCrear({ onSubmit, data, onClose, isEdit }) { 

  const [formData, setFormData] = useState({});
  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
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

  const handleSubmit = async () => {
    const inventoryForm = {
      // 3. CORRECCIÓN DEL MAPEO DE DATOS (Usar los 'name' de los fields)
      name: formData["catalogo-nombre"], 
      description: formData["catalogo-descripcion"],
      revision_date: formData["catalogo-revision"],
    };


    try {
      await onSubmit(inventoryForm, data?.id);
      // 2. USAR LA PROP RENOMBRADA
      onClose(); 
    } catch(error) {
        console.error("Error en handleSubmit:", error);
    }
  };

  return (
    <div>
      <h2>Crear Nuevo Catalogo</h2>
      <DynamicForm
        fields={fields}
        values={formData}
        onChange={handleChange}
      />
      <Button
        onClick={handleSubmit}
        color={"primary"}
        size={"small"}
      >
        {isEdit ? "Guardar Cambios" : "Crear"}
      </Button>
    </div>
  );
}
export default CatalogoCrear;