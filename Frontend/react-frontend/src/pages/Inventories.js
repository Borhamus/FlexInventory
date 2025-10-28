import React, { useState, useEffect } from 'react';
import InventoryService from '../services/InventoryService';
import InventoryTable from '../components/InventoryTable';
import "../styles/Inventories.css"
import MenuLateral from '../components/MenuLateral';
import Button from "../components/Button";
import NewInventoryDialogBody from '../Modals/NuevoInventarioFormulario';
import Modal from "../components/Modal2";
import InventarioArticulo from '../Modals/InventarioArticulo';
import ItemService from '../services/ItemService';

function Inventories() {
    const [elementos, setElementos] = useState([]); // Inventarios disponibles
    // Inicialmente null, porque no sabemos qué inventario hay
    const [selectedId, setSelectedId] = useState(null);

    const [inventario, setInventario] = useState([]);
    const [reload, setReload] = useState(false);

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

    useEffect(() => {
        if (elementos.length > 0 && selectedId === null) {
            setSelectedId(elementos[0].id);
        }
    }, [elementos, selectedId]);

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

                        // PREV SE TRATA DEL ESTADO ANTERIOR DEL USESTATE

                        // esta seccion toma el estado usestate y quita de él el selectedId del inventario borrado
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

    const formularioAgregarArticulo = {
        title: "Agregar Articulo",
        customView: (
            <InventarioArticulo
                datosInventario={inventario}
                onSubmit={async (payload) => {
                    await ItemService.createItem(payload);
                    setReload(prev => !prev);
                }}

            />),
        actions: [], // los botones están dentro del customView
    }

    const handleInventorySubmit = async (inventoryForm, isEdit, id) => {
        if (isEdit) {
            await InventoryService.updateInventory(id, inventoryForm);
        } else {
            await InventoryService.createInventory(inventoryForm);
            const data = await InventoryService.getAllInventories();
            setElementos(data);
        }
    };

    const formularioCrear = {
        title: "Crear Nuevo Inventario",
        customView: (
            <NewInventoryDialogBody
                onSubmit={handleInventorySubmit}
                isEdit={false}
            />
        ),
        actions: [], // los botones están dentro del customView
    };

    const formularioEditar = {
        title: "Editar " + (elementos.find(el => el.id === selectedId)?.name || ''),
        customView: (
            <NewInventoryDialogBody
                onSubmit={handleInventorySubmit}
                data={elementos.find(el => el.id === selectedId)}
                isEdit={true}
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
                        <InventoryTable
                            num={selectedId}
                            setDatosInventario={setInventario}
                            reload={reload}
                        />
                    )}
                </div>
                <div className="BotonesBajos">
                    <Button icon={"pi pi-plus-circle"} onClick={() => { setFormFields(formularioAgregarArticulo); setIsOpen(true); }} color={"primary"} name={"Agregar Articulo"} />
                    <Button icon={"pi pi-fw pi-pencil"} onClick={() => { setFormFields(formularioEditar); setIsOpen(true); }} color={"primary"} name={"Editar Inventario"} />
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
