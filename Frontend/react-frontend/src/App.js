// App.js
import './App.css';

import "primereact/resources/themes/md-light-deeppurple/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PrimeReactProvider } from 'primereact/api';
import React from 'react';

import AppRoutes from './routes/AppRoutes';


function App() {
    return (
        <PrimeReactProvider>
            <div className="App">
                {/* ------| CONTENIDO PRINCIPAL |------ */}
                <AppRoutes />
            </div>
        </PrimeReactProvider>
    );
}

export default App;
