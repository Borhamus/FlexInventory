import React, { useState } from 'react'
import "../styles/MenuLateralInventario.css"
import Button from "./Button";

function MenuLateralInventario({ titulo, elementos, onElementoSeleccionado, onCrearInventario }) {
  return (
    <div className='MenuLateralInventario'>
      <div className='MenuLateralTitulo'>{titulo}</div>
      <div className='listaDeInventarios'>
        <Button name="test" click = {onElementoSeleccionado} />
      </div>
      <div className='MenuLateralAcciones'>
        <h2>New Inventory</h2>
        <h2>Delete this inventory</h2>
      </div>
    </div>
  )
}


export default MenuLateralInventario;