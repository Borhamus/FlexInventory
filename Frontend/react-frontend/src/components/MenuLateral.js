// src/components/MenuLateral.js
import React from 'react'
import "../styles/MenuLateral.css"
import Button from "./Button";

function MenuLateral({ titulo = "default", elementos, onCreate, onDelete }) {
  // Array de botones con el nombre del inventario o catálogo
  const botonesPorElemento = elementos.map((i) => (
    <div key={i.id}>
      <Button icon={i.icon} name={i.label} onClick={i.command} color={"secondary-inverse"} />
    </div>
  ))

  return (
    <div className='MenuLateralComponente'>
      <div className='MenuLateralTitulo'>{titulo}</div>
      <div className='listaDeInventarios'>
        {botonesPorElemento}
      </div>
      <div className='MenuLateralAcciones'>
        {/* BOTON AGREGAR */}
        <Button
          icon={"pi pi-plus-circle"}
          onClick={onCreate}   // <- ahora lo decide el padre
          color={"primary-inverse"}
          name={"Nuevo"}
        />

        {/* BOTON ELIMINAR */}
        <Button
          icon={"pi pi-trash"}
          onClick={onDelete}   // <- ahora lo decide el padre
          color={"secondary-inverse"}
          name={"Eliminar"}
        />
      </div>
    </div>
  )
}

export default MenuLateral;
