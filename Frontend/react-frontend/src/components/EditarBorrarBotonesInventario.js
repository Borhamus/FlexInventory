import { useState } from "react";
import "../styles/EditarBorrarBotonesInventario.css"
import Modal from './Modal';

export default function EditarBorrarBotonesInventario() {
    const [showModal, setShowModal] = useState(false);
    const [modalChildren, setModalChildren] = useState(null);

    const modalEliminar = {
        title: "Eliminar elemento",
        body: (
            <div style={{ display: 'flex', flexDirection: "column", gap: "1.5em" }}>
                ¿Desea eliminar este elemento?
                <div style={{ display: 'flex', gap: "1em", justifyContent: 'space-evenly' }}>
                    <button onClick={() => setShowModal(false)}>
                        <i className=''></i>
                        Cancel
                    </button>
                    <button onClick={{}}>
                        <i className='pi pi-trash'></i>
                        Delete
                    </button>
                </div>
            </div>
        )
    }

    const modalEditar = {
        title: "Editar elemento",
        body: (
            <div style={{ display: 'flex', flexDirection: "column", gap: "1.5em" }}>
                ¿Desea Editar Este elemento?
                <div style={{ display: 'flex', gap: "1em", justifyContent: 'space-evenly' }}>
                    <button onClick={() => setShowModal(false)}>
                        <i className=''></i>
                        Cancel
                    </button>
                </div>
            </div>
        )
    }

    const handleModalEliminar = () => (
        setModalChildren(modalEliminar),
        setShowModal(true)
    )

    const handleModalEditar = () => (
        setModalChildren(modalEditar),
        setShowModal(true)
    )

    return (
        <div className="contenedorBotonesEditarBorrar">
            <div className="botonEditar">
                <button className="inventoryButtonDeleteEdit" onClick={handleModalEditar}>
                    <i className="pi pi-fw pi-pencil"></i>
                </button>

            </div>
            <div className="separadorEditarEliminar">

            </div>
            <div className="botonEliminar" onClick={handleModalEliminar}>
                <button className="inventoryButtonDeleteEdit">
                    <i className="pi pi-fw pi-trash"></i>
                </button>
            </div>
            <Modal open={showModal} onClose={() => setShowModal(false)} children={modalChildren} />
        </div>
    )
}
