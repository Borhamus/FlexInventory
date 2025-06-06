import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import AttributeService from '../services/AttributeService';
import "../styles/NewInventoryDialogBody.css"
import { useNavigate } from "react-router-dom";
import InventoryService from '../services/InventoryService';
import Button from './Button';

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
      <label key={a.id} className='dialog-body--checkbox-list--list--checkbox-item'>
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
    <ul className='dialog-body--inventory-form--input-container--accepted-list--container-list'>
      {selectedAttributes.map((id) => {
        const attr = attributes.find(a => a.id === id);
        return (
          <li key={id} className='dialog-body--inventory-form--input-container--accepted-list--container-list--item'>
            {attr ? attr.label : "Atributo no encontrado"}
          </li>
        );
      })}
    </ul>
  );

  const handleFormSubmit = async (event) => {
    event.preventDefault(); 

    try {
      const inventoryForm = {
        name: inventoryName,
        description: inventoryDescription,
        revision_date: inventoryRevisionDate,
        attributesIds: selectedAttributes

      }

      const response = await InventoryService.createInventory(inventoryForm);

    } catch (error) {
      console.error("Failed to create new inventory:", error);
    }
  };

  return (
    <div className='dialog-body'>
      <div className='dialog-body--left-container'>
        <div className='dialog-body--checkbox-list--search-bar'>
          <input
            type="text"
            name="attributeSearchBar"
            placeholder="Attribute name..."
            className='dialog-body--checkbox-list--search-bar--input'
          />
        </div>
        <div className='dialog-body--checkbox-list--list'>
          {checkBoxList}
        </div>
        <div className='dialog-body--checkbox-list--new-attribute-btn'>
          <button className='dialog-body--checkbox-list--new-attribute-btn--btn'>
            New Attribute
          </button>
        </div>
      </div>
      <div className='dialog-body--right-container'>
        <form onSubmit={handleFormSubmit} className='dialog-body--inventory-form'>
          <div className="dialog-body--inventory-form--input-container">
            <input
              type="text"
              name="inventoryName"
              placeholder="Inventory name..."
              className='dialog-body--inventory-form--input-container--inventory-name'
              value={inventoryName}
              onChange={(e) => setInventoryName(e.target.value)}
            />
            <input
              type="text"
              name="inventoryDescription"
              placeholder="Inventory description..."
              className='dialog-body--inventory-form--input-container--inventory-description'
              value={inventoryDescription}
              onChange={(e) => setInventoryDescription(e.target.value)}
            />
            <input
              type="date"
              name="inventoryRevisionDate"
              className='dialog-body--inventory-form--input-container--inventory-revison-date'
              value={inventoryRevisionDate}
              onChange={(e) => setInventoryRevisionDate(e.target.value)}
            />
          </div>
          <div className="dialog-body--inventory-form--input-container--accepted-list">
            {acceptedList}
          </div>
          <div className='dialog-body--inventory-form--input-container--submit-btn'>
            <input
              type="submit"
              value="Create"
              className="dialog-body--inventory-form--input-container--submit-btn--btn"
            />
          </div>
        </form>
      </div>
    </div>
  )
}
