import React, { useState } from 'react';
import DynamicForm from '../components/DynamicForm';
import ItemService from '../services/ItemService';
import Button from '../components/Button';

function InventarioArticulo({ datosInventario, onSubmit, close }) {
  const [values, setValues] = useState({ name: "" });

  const handleChange = (field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
  };

  const fields = [
    {
      label: "Nombre del Artículo",
      name: "name",
      type: "text",
      placeholder: "Nombre del artículo..."
    },
    ...datosInventario.attributes.map(attr => ({
      label: attr.name,
      name: String(attr.id), // usamos string como key
      type: attr.type === "INTEGER" || attr.type === "REAL" ? "number" : "text",
      placeholder: `Ingrese ${attr.name}...`
    }))
  ];

  const handleSubmit = async () => {
    const payload = {
      name: values.name,
      inventory: datosInventario.id,
      itemAtributeValue: {}
    };

    datosInventario.attributes.forEach(attr => {
      payload.itemAtributeValue[String(attr.id)] = values[String(attr.id)] || "";
    });

    try {
      await onSubmit(payload);
      close();
    } catch (error) {
      console.error("Error al crear el item:", error);
    }
  };

  return (
    <div>
      <DynamicForm fields={fields} values={values} onChange={handleChange} />
      <Button
            onClick={close}
            color={"secondary-inverse"}
            size={"small"}
            name={"Cancelar"}
          />
          <Button
            onClick={handleSubmit}
            color={"primary"}
            size={"small"}
            name={"Agregar Articulo"}
          />
    </div>
  );
}

export default InventarioArticulo;
