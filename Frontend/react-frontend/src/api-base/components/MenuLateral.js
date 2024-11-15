import React from 'react';
import { Menu } from 'primereact/menu';

function MenuLateral() {
    const items = [
        {
          label: 'Categoría 1',
          items: [
            { label: 'Opción 1-1', icon: 'pi pi-fw pi-check' },
            { label: 'Opción 1-2', icon: 'pi pi-fw pi-calendar' },
          ]
        },
        {
          label: 'Categoría 2',
          items: [
            { label: 'Opción 2-1', icon: 'pi pi-fw pi-user' },
            { label: 'Opción 2-2', icon: 'pi pi-fw pi-cog' }
          ]
        }
      ];

    return(
        <Menu model={items} className="w-full md:w-15rem" />
    )
}

export default MenuLateral;
