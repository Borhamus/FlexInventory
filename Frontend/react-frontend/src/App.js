import './App.css';

import "primereact/resources/themes/rhea/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";



import React from 'react';
import AppRoutes from './routes/AppRoutes';
import Navbar from './components/Navbar';


function App() {
    return (
        <div className='App'>
            <div className='container-fluid bg-secondary pt-0 pb-5'>
                <div className='row'>
                    <Navbar />
                    <AppRoutes />
                </div>
            </div>
        </div>
    );
}

export default App;
