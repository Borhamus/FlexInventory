// src/pages/DemoForm.js
import React, { useState } from "react";
import HybridModal from "../components/Modal2";
import DynamicForm from "../components/DynamicForm";

function Test() {
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState({});

  const fields = [
    { name: "nombre", label: "Nombre", type: "text" },
    { name: "email", label: "Correo electrónico", type: "email" },
    { name: "password", label: "Contraseña", type: "password" },
  ];

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    console.log("Datos enviados:", formData);
    setIsOpen(false);
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded">
        Abrir Formulario
      </button>

      <HybridModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Nuevo Usuario"
        actions={[
          { label: "Cancelar", onClick: () => setIsOpen(false), variant: "btn-secondary" },
          { label: "Guardar", onClick: handleSubmit, variant: "btn-primary" },
        ]}
      >
        <DynamicForm fields={fields} values={formData} onChange={handleChange} />
      </HybridModal>
    </div>
  );
}

export default Test;
