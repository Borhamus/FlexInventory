    import './App.css';

    import "primereact/resources/themes/rhea/theme.css";
    import "primereact/resources/primereact.min.css";
    import "primeicons/primeicons.css";

    import React from 'react';
    import AppRoutes from './routes/AppRoutes';
    import Navbar from './components/Navbar';
    import UserSession from './components/UserSession'; // Asegúrate de que la ruta sea correcta

    function App() {
        return (
            <div className="App">
                <div className="container-fluid bg-secondary pt-0 pb-5">
                    <div className="row">
                        <Navbar />
                        <AppRoutes />
                    </div>
                </div>

                {/* Coloca UserSession aquí, en el flujo normal de la página */}
                <div className="user-session-container">
                    <UserSession 
                        userName="Usuario Ejemplo"
                        userAvatar="/path/to/avatar.jpg"
                        onLogout={() => alert("Logout")}
                    />
                </div>
            </div>
        );
    }

    export default App;
