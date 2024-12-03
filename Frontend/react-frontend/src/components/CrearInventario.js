import React, { useState } from 'react';
import InventoryService from '../services/InventoryService';

function CrearInventario({ onClose, onInventoryCreated }) {
    const [inventoryName, setInventoryName] = useState('');
    const [inventoryDescription, setInventoryDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Estado para manejar la carga
    const [error, setError] = useState(null); // Para mostrar errores si hay alguno

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validación básica
        if (!inventoryName || !inventoryDescription) {
            setError("Todos los campos son obligatorios.");
            return;
        }

        const newInventory = {
            name: inventoryName,
            description: inventoryDescription
        };

        setIsLoading(true); // Activar carga

        InventoryService.createInventory(newInventory)
            .then(response => {
                console.log("Inventario creado:", response);
                onInventoryCreated(response); // Notificar al padre que se creó el inventario
                onClose(); // Cerrar el modal
                setIsLoading(false); // Desactivar carga
            })
            .catch(error => {
                console.error("Error al crear inventario:", error);
                setError("Hubo un problema al crear el inventario. Intenta de nuevo.");
                setIsLoading(false); // Desactivar carga
            });
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h2>Crear Inventario</h2>
                {error && <div className="error-message">{error}</div>} {/* Mostrar errores */}
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>Nombre del Inventario</label>
                        <input
                            type="text"
                            value={inventoryName}
                            onChange={(e) => setInventoryName(e.target.value)}
                            placeholder="Nombre del inventario"
                        />
                    </div>
                    <div>
                        <label>Descripción</label>
                        <input
                            type="text"
                            value={inventoryDescription}
                            onChange={(e) => setInventoryDescription(e.target.value)}
                            placeholder="Descripción del inventario"
                        />
                    </div>
                    <div>
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? "Creando..." : "Crear Inventario"}
                        </button>
                        <button type="button" onClick={onClose}>Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CrearInventario;
