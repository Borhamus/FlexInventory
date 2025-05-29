import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import AttributeService from '../services/AttributeService';
import "../styles/CrearInventarioCuerpoModal.css"
export default function CrearInventarioCuerpoModal() {

  // Cargar los inventarios al inicio
  useEffect(() => {
    AttributeService.getAllAttributes()
      .then(data => setElementos(data))
      .catch(error => console.error('Error al cargar inventarios:', error));
  }, []);

  const [elementos, setElementos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  console.log("Selected ids: " + selectedIds);
  const handleCheckboxChange = (event) => {
    const checkedId = event.target.value;
    if (event.target.checked) {
      setSelectedIds([...selectedIds, checkedId])
    } else {
      setSelectedIds(selectedIds.filter(id => id !== checkedId))
    }
  }
  const attributes = [
    ...elementos.map((elemento) => ({
      label: elemento.name,
      id: elemento.id
    }))
  ]

  // Lista de checkbox
  const checkboxList = attributes.map((a) => (
    <label key={a.id}>
      <input
        type="checkbox"
        value={a.id}
        checked={selectedIds.includes(a.id)}
        onChange={(event) => { handleCheckboxChange(event) }}
      />
      {a.label}
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
