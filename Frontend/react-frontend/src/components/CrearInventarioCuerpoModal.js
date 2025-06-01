import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import AttributeService from '../services/AttributeService';
import "../styles/CrearInventarioCuerpoModal.css"

export default function CrearInventarioCuerpoModal() {

  const [elements, setElements] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([])

  // Cargar los inventarios al inicio
  useEffect(() => {
    AttributeService.getAllAttributes()
      .then(data => setElements(data))
      .catch(error => console.error('Error al cargar inventarios:', error));
  }, []);

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
  

  const handleFormSubmit = () => {

  }

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
              placeholder="Nombre del Inventario"
            />
          </div>
          <div className="">
            <input
              type="text"
              name="inventoryDescription"
              placeholder="Descripcion"
            />
          </div>
          <div className="">
            <input
              type="date"
              name="inventoryRevisionDate"
              placeholder="Descripcion"
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
