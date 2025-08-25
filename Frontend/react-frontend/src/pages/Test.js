// src/pages/DemoForm.js
import React, { useState } from "react";
import HybridModal from "../components/Modal2";
import DynamicForm from "../components/DynamicForm";

function Test() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({});

  const fields = [
    { name: "nombre", type: "text", placeholder:"test" },
    { name: "email", type: "email", placeholder:"test 2"},
    { name: "password", type: "password", placeholder:"test 3"},
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
        onClose={
          () => {
            setIsOpen(false);
            setFormData({}); // Esto se hace ya que la modal no destruye el child que recibe.
          }
          
        }
        title="Nuevo Usuario"
        actions={[
          { label: "Cancelar", onClick: () => setIsOpen(false), color: "secondary", size: "small" },
          { label: "Guardar", onClick: handleSubmit, color: "primary", size: "small" },
        ]}
      >
        <DynamicForm fields={fields} values={formData} onChange={handleChange} />
      </HybridModal>
    </div>
  );
}

export default Test;
