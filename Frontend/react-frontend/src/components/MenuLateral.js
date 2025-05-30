import React, { useState } from 'react'
import "../styles/MenuLateralInventario.css"
import Button from "./Button";
import Modal from './Modal';

function MenuLateral({ titulo, showModalParam, elementos, modalCreate, modalDelete }) {

  const [showModal, setShowModal] = useState(showModalParam);
  const [modalChildren, setModalChildren] = useState(null);

  // Array de botones con el nombre del inventario o catalogo y con la función de cambiar la tabla
  const botonesPorElemento = elementos.map((i) => (
    <div>
      <Button icon={i.icon} name={i.label} click={i.command} />
    </div>
  ))

  const handleModalDelete = () => (
    setModalChildren(modalDelete),
    setShowModal(true)
  )

  const handleModalCreate = () => (
    setModalChildren(modalCreate),
    setShowModal(true)
  )

  return (
    <div className='MenuLateralInventario'>
      <div className='MenuLateralTitulo'>{titulo}</div>
      <div className='listaDeInventarios'>
        {botonesPorElemento}
      </div>
      <div className='MenuLateralAcciones'>
        <Button icon={"pi pi-plus"} name={"New"} click={(handleModalCreate)} bgColor={"green"} />
        <Button icon={"pi pi-minus"} name={"Delete"} click={(handleModalDelete)} bgColor={"red"}>
        </Button>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} children={modalChildren} />
    </div>
  )
}


export default MenuLateral;