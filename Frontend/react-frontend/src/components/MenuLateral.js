import React, { useState } from 'react'
import "../styles/MenuLateral.css"
import Button from "./Button";
import Modal from './Modal';

function MenuLateral({ titulo, showModal, setShowModal, elementos, modalCreate, modalDelete }) {

  const [modalChildren, setModalChildren] = useState(null);

  // Array de botones con el nombre del inventario o catalogo y con la función de cambiar la tabla
  const botonesPorElemento = elementos.map((i) => (
    <div key={i.id}>
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
    <div className='MenuLateralComponente'>
      <div className='MenuLateralTitulo'>{titulo}</div>
      <div className='listaDeInventarios'>
        {botonesPorElemento}
      </div>
      <div className='MenuLateralAcciones'>
        <Button icon={"pi pi-plus"} name={"New"} click={(handleModalCreate)} bgColor={"var(--md-sys-color-inverse-primary)"} fontColor={"var( --md-sys-color-inverse-surface)"}/>
        <Button icon={"pi pi-minus"} name={"Delete"} click={(handleModalDelete)} bgColor={"var(--md-sys-color-secondary-container)"} fontColor={"var(--md-sys-color-on-secondary-container)"}>
        </Button>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} children={modalChildren} />
    </div>
  )
}


export default MenuLateral;