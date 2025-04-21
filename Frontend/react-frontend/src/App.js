    import './App.css';

    import "primereact/resources/themes/rhea/theme.css";
    import "primereact/resources/primereact.min.css";
    import "primeicons/primeicons.css";
    import "/node_modules/primeflex/primeflex.css";

    import React from 'react';
    import AppRoutes from './routes/AppRoutes';
    import Navbar from './components/Navbar';
    import UserSession from './components/UserSession'; // Asegúrate de que la ruta sea correcta

    function App() {
        return (
            <div className="App">
                <div class= "grid">
                    <div class = "col-10">
                        <Navbar />
                        <AppRoutes />
                    </div>
                    {/* Coloca UserSession aquí, en el flujo normal de la página */}
                    <div class="col">
                        <UserSession 
                            userName="Usuario Ejemplo"
                            userAvatar="/path/to/avatar.jpg"
                            onLogout={() => alert("Logout")}
                        />
                    </div>
                </div>
            </div>
        );
    }

    export default App;
