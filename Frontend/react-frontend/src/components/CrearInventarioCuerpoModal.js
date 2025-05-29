import { useState, useEffect } from 'react'
import MenuLateral from './MenuLateral'
import { AttributeService } from '../services/AttributeService';
import InventoryService from '../services/InventoryService';

export default function CrearInventarioCuerpoModal() {

  // Cargar los inventarios al inicio
      useEffect(() => {
          InventoryService.getAllInventories()
              .then(data => setElementos(data))
              .catch(error => console.error('Error al cargar inventarios:', error));
      }, []);

  const [elementos, setElementos] = useState([]);
  const [selectedId, setSelectedId] = useState(1); // ID del atributo seleccionado

  const attributes = [
    ...elementos.map((elemento) => ({
      label: elemento.name,
      icon: 'pi pi-table',
      attributes: elemento.id,
      command: () => handleSeleccionarElemento(elemento.id),

    }))
  ]

  // Seleccionar un inventario
  const handleSeleccionarElemento = (id) => {
    setSelectedId(id);
  };


  return {
    title: "Crear Inventario",
    body: (
      <div className='CrearInventarioModalContainer'>
        <div className='CrearInventarioModalContainer__ListaAtributos'>
        </div>
        <div className='CrearInventarioModalContainer__nuevoInventario'>

        </div>
      </div>
    )
  }
}
