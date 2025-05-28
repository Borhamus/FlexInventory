import React from 'react';
import { Menu } from 'primereact/menu';


/*
function MenuLateral({ elementos, onElementoSeleccionado, onCrearInventario }) {
    
    // Template para los Elementos del menu lateral.
    // Hacer un componente item renderer
    const style = {height: "45px",display: "flex", marginLeft: "10px"};
    const itemRenderer = (item) => (
        
        <div className='p-menuitem-content' class = "text-white" style={style}>
            <a className="flex align-items-center p-menuitem-link">
                <span className={item.icon} />
                <span className="mx-2">{item.label}</span>
                {item.shortcut && <span className="ml-auto border-1 surface-border border-round surface-100 text-xs p-1">{item.shortcut}</span>}
            </a>
        </div>
    );
    
    const items = [
        {
            label: 'Inventarios',
            items: [
                ...elementos.map((elemento) => ({
                    label: elemento.name,
                    icon: 'pi pi-table',
                    command: () => onElementoSeleccionado(elemento.id),

                })),

                {
                    label: 'Crear Inventario',
                    icon: 'pi pi-plus',
                    command: onCrearInventario, // Llamamos la función pasada para abrir el modal
                    style: { backgroundColor: '#28a745'},
                    disabled: false,

                },

                {
                    label: 'Borrar Inventario',
                    icon: 'pi pi-minus',
                    command: onCrearInventario, // Llamamos la función pasada para abrir el modal
                    style: { backgroundColor: 'red',  },
                    disabled: false,

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
}*/