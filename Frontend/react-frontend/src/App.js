    import './App.css';

    import "primereact/resources/themes/md-light-deeppurple/theme.css";
    import "primereact/resources/primereact.min.css";
    import "primeicons/primeicons.css";
    import "/node_modules/primeflex/primeflex.css";
    import { PrimeReactProvider, PrimeReactContext } from 'primereact/api';

    import React from 'react';
    import AppRoutes from './routes/AppRoutes';
    import Navbar from './components/Navbar';
    import UserSession from './components/UserSession'; // Asegúrate de que la ruta sea correcta

    function App() {
        return (
            <PrimeReactProvider>
                <div className="App">
                    
                    {/* ------| GRID SUPERIOR - NAVBAR Y USER SESSION |------ */}
                    <div class= "grid">
                        <div class = "col-12">
                            <Navbar />
                        </div>
                        {/* Coloca UserSession aquí, en el flujo normal de la página   
                        <div class="col-2">
                            <UserSession 
                                userName="Usuario Ejemplo"
                                userAvatar="/path/to/avatar.jpg"
                                onLogout={() => alert("Logout")}
                            />
                        </div>
                        */}  
                    </div>

                    {/* ------| GRID DE CONTENIDO - SE CARGA SEGÚN EL APPROUTES |------ */}
                    <div class = "grid">
                            <div class = "col">
                                <AppRoutes />
                            </div>
                    </div>
                </div>
            </PrimeReactProvider>
        );
    }

    export default App;
