// App.js
import './App.css';

import "primereact/resources/themes/md-light-deeppurple/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PrimeReactProvider } from 'primereact/api';
import React from 'react';

import AppRoutes from './routes/AppRoutes';
import "./styles/material-theme/theme.css"


function App() {
    return (
        <div className="App">
            <PrimeReactProvider>
                {/* ------| CONTENIDO PRINCIPAL |------ */}
                <AppRoutes />
            </PrimeReactProvider>
        </div>
    );
}

export default App;
