import React from 'react';
import { Menubar } from 'primereact/menubar';

function Navbar() {
    const items = [
        { label: 'Home', icon: 'pi pi-fw pi-home', url: "/"},
        { label: 'Inventories', icon: 'pi pi-fw pi-table', url: "inventories"},
        { label: 'Catalogs', icon: 'pi pi-fw pi-book', url: "catalogs"},
        { label: 'Users', icon: 'pi pi-fw pi-users', url: "users"},
        { label: 'Settings', icon: 'pi pi-fw pi-cog', url: "settings"},
    ];

    return (
        <nav>
            <Menubar model={items} start = {"FlexInventory"} /> 
        </nav>
    );
}

export default Navbar;
