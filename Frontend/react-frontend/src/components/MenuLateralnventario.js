import React, { useState } from 'react'
import "../styles/MenuLateralInventario.css"
import Button from "./Button";
import Modal from './Modal';

function MenuLateralInventario({ titulo, elementos, onCreate, onDelete }) {


  return (
    <div className='MenuLateralInventario'>
      <div className='MenuLateralTitulo'>{titulo}</div>
      <div className='listaDeInventarios'>
        {elementos.map((i) => (
          <div>
            <Button icon={i.icon} name={i.label} click={i.command} />
          </div>
        ))}
      </div>
      <div className='MenuLateralAcciones'>
        <Button icon={"pi pi-plus"} name={"New"} click={onCreate} bgColor = {"green"}/>
        <Button icon={"pi pi-minus"} name={"Delete"} click={onDelete} bgColor = {"red"} />
      </div>
    </div>
  )
}


export default MenuLateralInventario;