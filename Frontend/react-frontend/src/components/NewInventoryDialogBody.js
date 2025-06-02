import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import AttributeService from '../services/AttributeService';
import "../styles/CrearInventarioCuerpoModal.css"
import { useNavigate } from "react-router-dom";
import InventoryService from '../services/InventoryService';

export default function NewInventoryDialogBody() {

  const [elements, setElements] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([])

  // Estados del formulario
  const [inventoryName, setInventoryName] = useState("");
  const [inventoryDescription, setInventoryDescription] = useState("");
  const [inventoryRevisionDate, setInventoryRevisionDate] = useState("");

  // Cargar los inventarios al inicio
  useEffect(() => {
    AttributeService.getAllAttributes()
      .then(data => setElements(data))
      .catch(error => console.error('Error al cargar inventarios:', error));
  }, []);

  // Para redirigir
  const navigate = useNavigate();

  const attributes = [
    ...elements.map((elemento) => ({
      label: elemento.name,
      id: elemento.id
    }))
  ]

  const handleCheckboxChange = (event) => {
    const checkedId = Number(event.target.value);
    if (event.target.checked) {
      setSelectedAttributes([...selectedAttributes, checkedId])
    } else {
      setSelectedAttributes(selectedAttributes.filter(id => id !== checkedId))
    }
  }

  console.log("Debug - Atributos seleccionados: " + selectedAttributes)

  const checkBoxList = (
    attributes.map((a) => (
      <label key={a.id} style={{ display: "flex" }}>
        <input
          type="checkbox"
          // El valor del check es el id del atributo
          value={a.id}

          // Cuando cambia el check se hace...
          onChange={(event) => { handleCheckboxChange(event) }}
        />
        {a.label}
      </label>
    ))
  )

  const acceptedList = (
    <ul>
      {selectedAttributes.map((id) => {
        const attr = attributes.find(a => a.id === id);
        return (
          <li key={id}>
            {attr ? attr.label : "Atributo no encontrado"}
          </li>
        );
      })}
    </ul>
  );


  /*

  {
    "name": "string",
    "description": "string",
    "revision_date": "2025-06-02T00:58:32.425Z",
    "attributesIds": [
      0
    ]
  }


  */

  // Función que se ejecuta al enviar el formulario
  const handleFormSubmit = async (event) => {
    event.preventDefault(); // Evita que el navegador recargue la página

    try {
      // Llamamos al backend
      const inventoryForm = {
        name: inventoryName,
        description: inventoryDescription,
        revision_date: inventoryRevisionDate,
        attributesIds: selectedAttributes

      }

      // Bienvenido a concurrencia, el await hace esperar a que el authService responda
      const response = await InventoryService.createInventory(inventoryForm);

    } catch (error) {
      console.error("Failed to create new inventory:", error);
    }
  };

  return (
    <div className='dialog-body'>
      <div className='dialog-body--checkbox-list'>
        {checkBoxList}
      </div>
      <div className='dialog-body--inventory-form'>
        <form onSubmit={handleFormSubmit}>
          <div className="dialog-body--inventory-form--textbox">
            <input
              type="text"
              name="inventoryName"
              placeholder="Inventory name..."

              value={inventoryName}
              onChange={(e) => setInventoryName(e.target.value)}
            />
          </div>
          <div className="">
            <input
              type="text"
              name="inventoryDescription"
              placeholder="Inventory description..."

              value={inventoryDescription}
              onChange={(e) => setInventoryDescription(e.target.value)}
            />
          </div>
          <div className="">
            <input
              type="date"
              name="inventoryRevisionDate"

              value={inventoryRevisionDate}
              onChange={(e) => setInventoryRevisionDate(e.target.value)}
            />
          </div>
          <div className="">
            {acceptedList}
          </div>
          <input
            type="submit"
            value="Create"
            className=""
          />
        </form>
      </div>
    </div>
  )
}
