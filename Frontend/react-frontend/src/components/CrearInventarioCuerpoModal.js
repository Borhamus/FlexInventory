import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import AttributeService from '../services/AttributeService';
import "../styles/CrearInventarioCuerpoModal.css"
import { useNavigate } from "react-router-dom";
import InventoryService from '../services/InventoryService';

export default function CrearInventarioCuerpoModal() {

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

  // Función que se ejecuta al enviar el formulario
      const handleFormSubmit = async (event) => {
          event.preventDefault(); // Evita que el navegador recargue la página

          try {
              // Llamamos al backend
              const inventoryForm = {
                  inventoryName: inventoryName,
                  inventoryDescription: inventoryDescription,
                  inventoryRevisionDate: inventoryRevisionDate,
                  attributesIds: selectedAttributes
                  
              }
  
              // Bienvenido a concurrencia, el await hace esperar a que el authService responda
              const response = await InventoryService.createInventory(inventoryForm);
              
              // Redirigimos al usuario a la página principal (o donde quieras)
              navigate("/Home");
  
          } catch (error) {
              console.error("Failed to create new inventory:", error);
          }
      };

  return (
    <div className='CrearInventarioModalContainer'>
      <div className='CrearInventarioModalContainer__ListaAtributos'>
        {checkBoxList}
      </div>
      <div className='CrearInventarioModalContainer__nuevoInventario'>
        <form onSubmit={handleFormSubmit}>
          <div className="">
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
