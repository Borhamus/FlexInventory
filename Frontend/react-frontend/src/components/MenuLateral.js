import React from 'react';
import { Menu } from 'primereact/menu';

function MenuLateral({ elementos, onElementoSeleccionado }) {
    
    // Mapeamos la lista de elementos para construir el modelo del menú
    let items = [
        {
            label: 'Inventories', // Título del grupo
            items: elementos.map((elemento) => ({
                label: elemento.name, // Nombre a mostrar
                icon: 'pi pi-table', // Puedes personalizar esto o pasarlo desde los datos
                command: () => onElementoSeleccionado(elemento.id) // Manejador para capturar el id
            }))
        }
    ];

    return (
        <div className='container-fluid'>
            <div className='row'>
                <Menu model={items} className="w-full md:w-15rem" />
            </div>
        </div>
    );
}

export default MenuLateral;

