import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import AttributeService from '../services/AttributeService';
import "../styles/CrearInventarioCuerpoModal.css"

export default function CrearInventarioCuerpoModal() {

  const [elementos, setElementos] = useState([]);

  // Cargar los inventarios al inicio
  useEffect(() => {
    AttributeService.getAllAttributes()
      .then(data => setElementos(data))
      .catch(error => console.error('Error al cargar inventarios:', error));
  }, []);

  const attributes = [
    ...elementos.map((elemento) => ({
      label: elemento.name,
      id: elemento.id
    }))
  ]

  return (
    <div className='CrearInventarioModalContainer'>
      <div className='CrearInventarioModalContainer__ListaAtributos'>
      </div>
      <div className='CrearInventarioModalContainer__nuevoInventario'>
        <form onSubmit={{}}>
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
