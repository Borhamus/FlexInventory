import React, { useState } from 'react'
import "../styles/MenuLateral.css"
import Button from "./Button";
//import Modal from './Modal';
import Modal from './Modal2';
import DynamicForm from "../components/DynamicForm";

function MenuLateral({ titulo = "default", elementos, formularioBorrar, formularioCrear }) {

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [formFields, setFormFields] = useState({});

  // Array de botones con el nombre del inventario o catalogo y con la función de cambiar la tabla
  const botonesPorElemento = elementos.map((i) => (
    <div key={i.id}>
      <Button icon={i.icon} name={i.label} onClick={i.command} color={"secondary-inverse"} />
    </div>
  ))

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = () => {
    console.log("Datos enviados:", formData);
    setIsOpen(false);
  };

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
          onClick={() => {
            setIsOpen(true);
            setFormFields(formularioCrear);
          }}
          color={"primary-inverse"}
          type={""}
          name={formularioCrear.title} />

        {/* BOTON ELIMINAR */}
        <Button
          icon={"pi pi-trash"}
          onClick={() => {
            setIsOpen(true);
            setFormFields(formularioBorrar);
          }}
          color={"secondary-inverse"}
          type={""}
          name={formularioBorrar.title} />
      </div>

      {/*<Modal open={showModal} onClose={() => setShowModal(false)} children={modalChildren} /> */}
      <Modal
        isOpen={isOpen}
        onClose={
          () => {
            setIsOpen(false);
            setFormData({}); // No guarda los datos en la modal.
          }

        }
        title={formFields.title}
        actions={formFields.actions}
      >
        {/* SI HAY UN CUSTOMVIEW LO CARGO, SINO, USO EL DYNAMICFORM */}
        {formFields.customView ?? (
          <DynamicForm fields={formFields.fields} values={formData} onChange={handleChange} />
        )}
      </Modal>
    </div>
  )
}


export default MenuLateral;