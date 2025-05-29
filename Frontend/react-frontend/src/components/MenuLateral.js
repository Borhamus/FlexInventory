import React, { useState } from 'react'
import "../styles/MenuLateralInventario.css"
import Button from "./Button";
import Modal from './Modal';
import CrearInventarioCuerpoModal from './CrearInventarioCuerpoModal';

function MenuLateral({ titulo, elementoNombre, elementos, onCreate, onDelete }) {

  const [showModal, setShowModal] = useState(false);
  const [modalChildren, setModalChildren] = useState(null);

  // Array de botones con el nombre del inventario o catalogo y con la función de cambiar la tabla
  const botonesPorElemento = elementos.map((i) => (
    <div>
      <Button icon={i.icon} name={i.label} click={i.command} />
    </div>
  ))

  // Cuerpo de la modal de eliminar elementos, debería hacerse una distinción entre inventarios y catalogos
  // por ejemplo que el titulo sea Eliminar Inventario/ Eliminar Catalogo respectivamente.
  const modalEliminar = {
    title: "Eliminar " + elementoNombre,
    body: (
      <div style={{ display: 'flex', flexDirection: "column", gap:"1.5em"}}>
        ¿Desea eliminar este {elementoNombre}?
        <div style={{display:'flex', gap:"1em", justifyContent:'space-evenly'}}>
          <button onClick={() => setShowModal(false)}>
            <i className=''></i>
            Cancel
          </button>
          <button onClick={onDelete}>
            <i className='pi pi-trash'></i>
            Delete
          </button>
        </div>
      </div>
    )
  }

  const modalCrear = {
    title: "Crear " + elementoNombre,
    body: (
      <div>
        <CrearInventarioCuerpoModal />
      </div>
    )
  }

  const handleModalEliminar = () => (
    setModalChildren(modalEliminar),
    setShowModal(true)
  )

  const handleModalCrear = () => (
    setModalChildren(modalCrear),
    setShowModal(true)
  )

  return (
    <div className='MenuLateralInventario'>
      <div className='MenuLateralTitulo'>{titulo}</div>
      <div className='listaDeInventarios'>
        {botonesPorElemento}
      </div>
      <div className='MenuLateralAcciones'>
        <Button icon={"pi pi-plus"} name={"New"} click={(handleModalCrear)} bgColor={"green"} />
        <Button icon={"pi pi-minus"} name={"Delete"} click={(handleModalEliminar)} bgColor={"red"}>
        </Button>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} children={modalChildren} />
    </div>
  )
}


export default MenuLateral;