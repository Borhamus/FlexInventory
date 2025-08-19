import React, { useState } from 'react'
import "../styles/MenuLateral.css"
import Button from "./Button";
import Modal from './Modal';

function MenuLateral({ titulo, showModal, setShowModal, elementos, modalCreate, modalDelete }) {

  const [modalChildren, setModalChildren] = useState(null);

  // Array de botones con el nombre del inventario o catalogo y con la función de cambiar la tabla
  const botonesPorElemento = elementos.map((i) => (
    <div key={i.id}>
      <Button icon={i.icon} name={i.label} click={i.command} color={"secondary-inverse"}/>
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
        <Button icon={"pi pi-plus-circle"} onClick={(handleModalCreate)} color={"primary-inverse"} type = {""} name={modalCreate.title}/>
        <Button icon={"pi pi-trash"} onClick={(handleModalDelete)} color = {"secondary-inverse" } type = {""} name={modalDelete.title}/>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} children={modalChildren} />
    </div>
  )
}


export default MenuLateral;