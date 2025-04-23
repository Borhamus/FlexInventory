import React from 'react';
import { Menu } from 'primereact/menu';

function MenuLateral({ elementos, onElementoSeleccionado, onCrearInventario }) {
    const items = [
        {
            label: 'Inventarios',
            items: [
                ...elementos.map((elemento) => ({
                    label: elemento.name,
                    icon: 'pi pi-table',
                    command: () => onElementoSeleccionado(elemento.id)
                })),
                {
                    label: 'Crear Inventario',
                    icon: 'pi pi-plus',
                    command: onCrearInventario, // Llamamos la función pasada para abrir el modal
                    style: { backgroundColor: '#28a745', color: 'white' },
                    disabled: false
                },

                {
                    label: 'Borrar Inventario',
                    icon: 'pi pi-minus',
                    command: onCrearInventario, // Llamamos la función pasada para abrir el modal
                    style: { backgroundColor: 'red', color: "white" },
                    disabled: false
                }
            ]
        }
    ];

    return (
        <div>
                <Menu model={items} className="w-full md:w-15rem" />
        </div>
    );
}

export default MenuLateral;
