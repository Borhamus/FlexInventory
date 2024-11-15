import React from 'react';
import { Menubar } from 'primereact/menubar';

function Navbar({ onMenuClick }) {
    const items = [
        { label: 'Home', icon: 'pi pi-fw pi-home'},
        { label: 'Inventories', icon: 'pi pi-fw pi-table'},
        { label: 'Catalogs', icon: 'pi pi-fw pi-book'},
        { label: 'Users', icon: 'pi pi-fw pi-users'},
        { label: 'Settings', icon: 'pi pi-fw pi-cog'},
    ];

    return (
        <nav>
            <Menubar model={items} /> 
        </nav>
    );
}

export default Navbar;
