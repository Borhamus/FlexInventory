import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import AttributeService  from '../services/AttributeService';
import "../styles/CrearInventarioCuerpoModal.css"
export default function CrearInventarioCuerpoModal() {

  // Cargar los inventarios al inicio
  useEffect(() => {
    AttributeService.getAllAttributes()
      .then(data => setElementos(data))
      .catch(error => console.error('Error al cargar inventarios:', error));
  }, []);

  const [elementos, setElementos] = useState([]);

  const attributes = [
    ...elementos.map((elemento) => ({
      label: elemento.name,
      id: elemento.id
    }))
  ]

  // Lista de checkbox
  const checkboxList = attributes.map((a) => (
    <label key={a.id}>
      <input type="checkbox" value={a.id} />
      {a.name}
    </label>
  ));


  return (
    <div className='CrearInventarioModalContainer'>
      <div className='CrearInventarioModalContainer__ListaAtributos'>
        {checkboxList}
      </div>
      <div className='CrearInventarioModalContainer__nuevoInventario'>
        asdsa
      </div>
    </div>
  )
}
