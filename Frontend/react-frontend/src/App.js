// App.js
import './App.css';

import "primereact/resources/themes/md-light-deeppurple/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "/node_modules/primeflex/primeflex.css";

import { PrimeReactProvider } from 'primereact/api';
import React from 'react';

import AppRoutes from './routes/AppRoutes';
import Navbar from './components/Navbar';


function App() {
    return (
        <PrimeReactProvider>
            <div className="App">
                {/* ------| CONTENIDO PRINCIPAL |------ */}
                <div className="grid">
                    <div className="col">
                        <AppRoutes />
                    </div>
                </div>
            </div>
        </PrimeReactProvider>
    );
}

export default App;
