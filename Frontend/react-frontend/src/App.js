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
import { AuthProvider, useAuth } from './context/AuthProvider';

function MainApp() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="App">

            {/* ------| NAVBAR SOLO SI ESTÁ AUTENTICADO |------ */}
            {isAuthenticated && (
                <div className="grid">
                    <div className="col-12">
                        <Navbar />
                    </div>
                </div>
            )}

            {/* ------| CONTENIDO PRINCIPAL |------ */}
            <div className="grid">
                <div className="col">
                    <AppRoutes />
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <PrimeReactProvider>
            <AuthProvider>
                <MainApp />
            </AuthProvider>
        </PrimeReactProvider>
    );
}

export default App;
