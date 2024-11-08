
import React, { useRef } from 'react';
import { Menu } from 'primereact/menu';

function MenuLateral() {
    const menuOpciones = ['Inventarios', 'Catalogos'];

    const items =  [
            {
            label: menuOpciones[0],
            items: [
                {
                    label: 'Buscar:',
                    icon: 'pi pi-search'
                },
                {
                    label: menuOpciones[0] + ' - i',
                    icon: 'pi pi-play'
                },
                
            ]
        }
    ];


    return (<Menu model={items} className="w-full md:w-15rem"  />);

}


export default MenuLateral; 





