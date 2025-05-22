import React from 'react';
import { Menubar } from 'primereact/menubar';
import { Avatar } from 'primereact/avatar';  
import { Button } from 'primereact/button';
import "/node_modules/primeflex/primeflex.css";
import "../styles/Navbar.css"

function Navbar() {
    const items = [
        { label: 'Home', icon: 'pi pi-fw pi-home', url: "/home"},
        { label: 'Inventories', icon: 'pi pi-fw pi-table', url: "inventories"},
        { label: 'Catalogs', icon: 'pi pi-fw pi-book', url: "catalogs"},
        { label: 'Users', icon: 'pi pi-fw pi-users', url: "users"},
    ];

    // Logo de la página web
    const start = <img alt="logo" src="https://primefaces.org/cdn/primereact/images/logo.png" height="40" className="mr-2"></img>;

    // Usuario y configuraciones
    const end = (
        <div className="flex align-items-center gap-2">
            Nombre de Usuario
            <Avatar icon="pi pi-user" size="large" shape="circle" />

            <a href='/settings'>
            <Button icon="pi pi-cog" rounded aria-label="Filter" />
            </a>
        </div>
    );

    return (
        <nav className='navbar-container'>
            <div className='navbarLeft'>
                <a className='linkNavbar linkNavbar--home' href="/home">FlexInventory</a>
            </div>
            <div className='navbarCenter'>
                <a className='linkNavbar linkNavbar--inventories' href="/inventories" >Inventories</a>
                <a className='linkNavbar linkNavbar--catalogs' href="/catalogs">Catalogs</a>
                <a className='linkNavbar linkNavbar--users' href="/users">Users</a>
            </div>
            <div className='navbarRight'>
                <a className='linkNavbar linkNavbar--user' href="/profile">👤</a>
                <a className='linkNavbar linkNavbar--settings' href="/settings">Config</a>
            </div>
        </nav>
    );
}

export default Navbar;
