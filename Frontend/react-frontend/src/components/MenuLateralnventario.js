import React, { useState } from 'react'
import "../styles/MenuLateralInventario.css"
import Button from "./Button";
import Modal from './Modal';

function MenuLateralInventario({ titulo, elementos, onElementoSeleccionado, onCrearInventario, onEliminarInventario }) {

  const inventories = [
    ...elementos.map((elemento) => ({
      label: elemento.name,
      icon: 'pi pi-table',
      command: () => onElementoSeleccionado(elemento.id),

    }))
  ]


  return (
    <div className='MenuLateralInventario'>
      <div className='MenuLateralTitulo'>{titulo}</div>
      <div className='listaDeInventarios'>
        {inventories.map((i) => (
          <div>
            <Button icon={i.icon} name={i.label} click={i.command} />
          </div>
        ))}
      </div>
      <div className='MenuLateralAcciones'>
        <Button icon={"pi pi-plus"} name={"New Inventory"} click={onCrearInventario} bgColor = {"green"}/>
        <Button icon={"pi pi-minus"} name={"Delete Inventory"} click={onEliminarInventario} bgColor = {"red"} />
      </div>
    </div>
  )
}


export default MenuLateralInventario;