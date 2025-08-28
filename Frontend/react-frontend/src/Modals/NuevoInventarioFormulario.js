import { useState, useEffect } from 'react';
import AttributeService from '../services/AttributeService';
import "../styles/NewInventoryDialogBody.css";
import DynamicForm from "../components/DynamicForm";
import Button from '../components/Button';
import Modal2 from "../components/Modal2";

export default function NuevoInventarioFormulario({ onSubmit, close }) {
  const [elements, setElements] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [formData, setFormData] = useState({});

  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");

  const handleCreateAttribute = async () => {
    try {
      const created = await AttributeService.createAttribute({ name: newAttrName });
      setElements(prev => [...prev, created]); // refresca lista local
      setNewAttrName("");
      setIsAttrModalOpen(false); // cierra modal
    } catch (err) {
      console.error("No se pudo crear atributo:", err);
    }
  };

  // cargar atributos disponibles
  useEffect(() => {
    AttributeService.getAllAttributes()
      .then(data => setElements(data))
      .catch(error => console.error('Error al cargar atributos:', error));
  }, []);

  const attributes = elements.map((e) => ({
    label: e.name,
    id: e.id
  }));

  const handleCheckboxChange = (event) => {
    const checkedId = Number(event.target.value);
    if (event.target.checked) {
      setSelectedAttributes([...selectedAttributes, checkedId]);
    } else {
      setSelectedAttributes(selectedAttributes.filter(id => id !== checkedId));
    }
  };

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    const inventoryForm = {
      name: formData["Nombre del Inventario"],
      description: formData["Descripcion del Inventario"],
      revision_date: formData["Fecha de revision"],
      attributesIds: selectedAttributes,
    };
    try {
      await onSubmit(inventoryForm); // crea y refresca lista (padre)
      close();                       // cierra modal desde el hijo
    } catch (e) {
      console.error("Failed to create inventory:", e);
      // puedes mostrar un toast aquí si quieres
    }
  };

  // lista de checkboxes
  const checkBoxList = (
    attributes.map((a) => (
      <label key={a.id} className='dialog-body--checkbox-list--list--checkbox-item'>
        <input
          type="checkbox"
          value={a.id}
          onChange={handleCheckboxChange}
        />
        {a.label}
      </label>
    ))
  );

  // lista de seleccionados
  const acceptedList = (
    <ul className='dialog-body--inventory-form--input-container--accepted-list--container-list'>
      {selectedAttributes.map((id) => {
        const attr = attributes.find(a => a.id === id);
        return (
          <li
            key={id}
            className='dialog-body--inventory-form--input-container--accepted-list--container-list--item'
          >
            {attr ? attr.label : "Atributo no encontrado"}
          </li>
        );
      })}
    </ul>
  );

  const fields = [
    { label: "Nombre del Inventario", name: "Nombre del Inventario", type: "text", placeholder: "Nombre del Inventario..." },
    { label: "Descripcion del Inventario", name: "Descripcion del Inventario", type: "text", placeholder: "Descripcion del inventario..." },
    { label: "Fecha de revision", name: "Fecha de revision", type: "date" }
  ];

  return (
    <div className='dialog-body'>
      <div className='dialog-body--left-container'>
        Lista de Atributos:
        <div className='dialog-body--checkbox-list--list'>
          {checkBoxList}
        </div>
        <div className='dialog-body--checkbox-list--new-attribute-btn'>
          <Button
            icon={"pi pi-plus"}
            onClick={() => setIsAttrModalOpen(true)}
            color={"secondary-inverse"}
            size={"small"}
            name={"Nuevo Atributo"}
          />
        </div>
      </div>

      <div className='dialog-body--right-container'>
        <DynamicForm fields={fields} values={formData} onChange={handleChange} />

        <div className="dialog-body--inventory-form--input-container--accepted-list">
          Atributos seleccionados:
          {acceptedList}
        </div>

        <div className="dialog-body--inventory-form--input-container--submit-btn">
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
            name={"Crear"}
          />
        </div>
      </div>

      <Modal2
        isOpen={isAttrModalOpen}
        onClose={() => setIsAttrModalOpen(false)}
        title="Crear Atributo"
        actions={[
          { label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small" },
          {
            label: "Guardar", onClick: async (close) => {
              await handleCreateAttribute();
              close();
            }, color: "primary", size: "small"
          },
        ]}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
          <label>
            Nombre del Atributo:
            <input
              type="text"
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
            />
          </label>
        </div>
      </Modal2>
    </div>
  );
}
