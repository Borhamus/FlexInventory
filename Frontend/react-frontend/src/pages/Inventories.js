import React, { useState, useEffect } from 'react';
import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import "../styles/Inventories.css"
import MenuLateral from '../components/MenuLateral';
import Button from "../components/Button";
import NewInventoryDialogBody from '../Modals/NuevoInventarioFormulario';

function Inventories() {

    const [elementos, setElementos] = useState([]); // Inventarios disponibles

    // Inicialmente null, porque no sabemos qué inventario hay
    const [selectedId, setSelectedId] = useState(null);

    // Cuando llegan los inventarios, asigno el primero
    useEffect(() => {
        InventoryService.getAllInventories()
            .then(data => {
                setElementos(data);
                if (data.length > 0) {
                    setSelectedId(data[0].id); // <-- selecciona el primero válido
                }
            })
            .catch(error => console.error('Error al cargar inventarios:', error));
    }, []);

    const [showModal, setShowModal] = useState(false);

    // Mapeo la respuesta del axios...
    const inventories = [
        ...elementos.map((elemento) => ({
            id: elemento.id,
            label: elemento.name,
            icon: '',
            attributes: elemento.attributes,
            command: () => handleSeleccionarElemento(elemento.id),

        }))
    ]

    // Manejar la eliminación de inventarios
    const handleDeleteInventory = (event) => {
        InventoryService.deleteInventoryById(selectedId)
            .then(() => {
                setElementos(prev => prev.filter(el => el.id !== selectedId));
                setSelectedId(null);
            })
            .catch(error => alert('No se pudo eliminar el inventario.'));
        setShowModal(false);
    };

    // Seleccionar un inventario
    const handleSeleccionarElemento = (id) => {
        setSelectedId(id);
    };

    // Cuerpo de la modal de eliminar inventarios
    //const modalDeleteInventory = {
    //    title: "Eliminar este Inventario",
    //    body: (
    //        <div style={{ display: 'flex', flexDirection: "column", gap: "1.5em" }}>
    //            ¿Desea eliminar este Inventario?
    //            <div style={{ display: 'flex', gap: "1em", justifyContent: 'space-evenly' }}>
    //                <button onClick={() => setShowModal(false)}>
    //                    <i className=''></i>
    //                    Cancel
    //                </button>
    //                <button onClick={handleDeleteInventory}>
    //                    <i className='pi pi-trash'></i>
    //                    Delete
    //                </button>
    //            </div>
    //        </div>
    //    )
    //}

    //const modalCreateInventory = {
    //    title: "Nuevo inventario",
    //    body: (
    //        <div>
    //            <CrearInventarioCuerpoModal />
    //        </div>
    //    )
    //}

    const formularioBorrar = {
        title: "Eliminar este Inventario",
        fields: [],
        customView: "¿Seguro que desea eliminar este inventario?",
        actions: [
            { label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small" },
            { label: "Eliminar", onClick: (close) => close(), color: "primary", size: "small" },
        ],
    }

    const formularioCrear = {
        title: "Crear Nuevo Inventario",
        fields: [],
        customView: <NewInventoryDialogBody/>,
        actions: [
            { label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small" },
            { label: "Crear", onClick: (close) => close(), color: "primary", size: "small" },
        ],
    }


    return (
        <div className="inventory">

            <div className="inventory--MenuLateral">
                <MenuLateral
                    titulo="Inventarios"
                    elementos={inventories}
                    formularioBorrar={formularioBorrar}
                    formularioCrear={formularioCrear}
                />
            </div>
            <div className='ContenedorTablaBoton'>
                <div className="inventarioTabla">
                    {selectedId !== null && (
                        <div>
                            <InventoryTable num={selectedId} />
                        </div>
                    )}
                </div>
                <div className="BotonesBajos">
                    <Button icon={"pi pi-plus-circle"} onClick={""} color={"primary"} type={""} name={"Agregar Articulo"} />
                    <Button icon={"pi pi-fw pi-pencil"} onClick={""} color={"primary"} type={""} name={"Editar Inventario"} />
                </div>
            </div>
        </div>
    );
}

export default Inventories;
