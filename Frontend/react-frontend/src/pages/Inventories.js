import React, { useState, useEffect } from 'react';
import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import "../styles/Inventories.css"
import MenuLateral from '../components/MenuLateral';
import Button from "../components/Button";
import NewInventoryDialogBody from '../Modals/NuevoInventarioFormulario';
import Modal from "../components/Modal2";

function Inventories() {
    const [elementos, setElementos] = useState([]); // Inventarios disponibles
    const [showInventoryTable, setShowInventoryTable] = useState(true);
    // Inicialmente null, porque no sabemos qué inventario hay
    const [selectedId, setSelectedId] = useState(null);
    // Cuando llegan los inventarios, asigno el primero
    useEffect(() => {
        InventoryService.getAllInventories()
            .then(data => {
                setElementos(data);
                if (data.length > 0) {
                    setSelectedId(data[0].id);
                }
            })
            .catch(error => console.error('Error al cargar inventarios:', error));
    }, []);

    // ---- Modal control ----
    const [isOpen, setIsOpen] = useState(false);
    const [formFields, setFormFields] = useState(null);

    // Configs de formularios
    const formularioBorrar = {
        title: "Eliminar este Inventario",
        customView: (
            <div style={{ display: 'flex', flexDirection: "column", gap: "1.5em" }}>
                ¿Desea eliminar este Inventario?
            </div>
        ),
        actions: [
            { label: "Cancelar", onClick: (close) => close(), color: "secondary", size: "small" },
            {
                label: "Eliminar", onClick: async (close) => {
                    try {
                        await InventoryService.deleteInventoryById(selectedId);
                        setElementos(prev => prev.filter(el => el.id !== selectedId));
                        setSelectedId(null);
                        close();
                    } catch {
                        alert('No se pudo eliminar el inventario.');
                    }
                }, color: "primary", size: "small"
            },
        ],
    }

    const formularioCrear = {
        title: "Crear Nuevo Inventario",
        customView: (
            <NewInventoryDialogBody
                onSubmit={async (inventoryForm) => {
                    await InventoryService.createInventory(inventoryForm);
                    const data = await InventoryService.getAllInventories();
                    setElementos(data);
                }}
            />
        ),
        actions: [], // los botones están dentro del customView
    };


    const inventories = elementos.map((elemento) => ({
        id: elemento.id,
        label: elemento.name,
        icon: '',
        attributes: elemento.attributes,
        command: () => setSelectedId(elemento.id),
    }));

    return (
        <div className="inventory">

            {/* MENU LATERAL */}
            <div className="inventory--MenuLateral">
                <MenuLateral
                    titulo="Inventarios"
                    elementos={inventories}
                    onCreate={() => { setFormFields(formularioCrear); setIsOpen(true); }}
                    onDelete={() => { setFormFields(formularioBorrar); setIsOpen(true); }}
                />
            </div>

            <div className='ContenedorTablaBoton'>
                <div className="inventarioTabla">
                    {selectedId !== null && (
                        <InventoryTable num={selectedId} />
                    )}
                </div>
                <div className="BotonesBajos">
                    <Button icon={"pi pi-plus-circle"} onClick={""} color={"primary"} name={"Agregar Articulo"} />
                    <Button icon={"pi pi-fw pi-pencil"} onClick={""} color={"primary"} name={"Editar Inventario"} />
                </div>
            </div>

            {/* Modal global controlada por Inventories */}
            <Modal
                isOpen={isOpen}
                onClose={() => (
                    setIsOpen(false),
                    setFormFields({}) // Esto es para borrar los campos del formulario, asi no queda cargado cuando cerramos la modal
                )}
                title={formFields?.title}
                actions={formFields?.actions || []}
            >
                {formFields?.customView}
            </Modal>
        </div>
    );
}

export default Inventories;
