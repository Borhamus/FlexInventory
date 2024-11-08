import React from 'react';
import { Menu } from 'primereact/menu';

function MenuLateral({ menuSeleccionado, inventarios, catalogos }) {
    // Selecciona los elementos basados en el menú actual
    const items = menuSeleccionado === 'Inventarios' ? [
        {
            label: 'Inventarios',
            items: inventarios.map((inv) => ({
                label: inv.name, // Suponiendo que el objeto tiene una propiedad "label" o "nombre"
                icon: 'pi pi-play'
            }))
        }
    ] : menuSeleccionado === 'Catalogos' ? [
        {
            label: 'Catalogos',
            items: catalogos.map((cat) => ({
                label: cat.name, // Suponiendo que el objeto tiene una propiedad "label" o "nombre"
                icon: 'pi pi-play'
            }))
        }
    ] : [];

    return <Menu model={items} className="w-full md:w-15rem" />;
}

export default MenuLateral;
