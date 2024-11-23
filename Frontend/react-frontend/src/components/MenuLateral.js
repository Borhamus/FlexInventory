import React from 'react';
import { Menu } from 'primereact/menu';

function MenuLateral({ elementos, onElementoSeleccionado }) {
    // Mapeamos la lista de elementos para construir el modelo del menú
    const items = elementos.map((elemento) => ({
        label: elemento.name, // Nombre a mostrar
        icon: 'pi pi-fw pi-file', // Puedes personalizar esto o pasarlo desde los datos
        command: () => onElementoSeleccionado(elemento.id) // Manejador para capturar el id
    }));

    return (
        <Menu model={items} className="w-full md:w-15rem" />
    );
}

export default MenuLateral;
