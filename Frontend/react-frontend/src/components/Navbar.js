import React from 'react';
import { Menubar } from 'primereact/menubar';
import { Avatar } from 'primereact/avatar';  
import { Button } from 'primereact/button';
import "/node_modules/primeflex/primeflex.css";
import "../styles/Navbar.css"

function Navbar() {

    return (
        <nav className='navbar-container'>
            <div className='navbarLeft'>
                <b className='linkNavbar--title'>FlexInventory</b>
            </div>
            <div className='navbarCenter'>
                <a className='linkNavbar linkNavbar--inventories' href="/inventories" >Inventories</a>
                <a className='linkNavbar linkNavbar--catalogs' href="/catalogs">Catalogs</a>
                <a className='linkNavbar linkNavbar--users' href="/users">Users</a>
            </div>
            <div className='navbarRight'>
                <a className='linkNavbar linkNavbar--user' href="/profile"><i className="pi pi-fw pi-user"></i></a>
                <a className='linkNavbar linkNavbar--settings' href="/settings"><i className="pi pi-fw pi-cog"></i></a>
            </div>
        </nav>
    );
}

export default Navbar;
