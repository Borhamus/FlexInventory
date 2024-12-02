import React from 'react';
import { confirmDialog } from 'primereact/confirmdialog';
import { Button } from 'primereact/button';

const ConfirmDelInv = ({ inventoryId, onConfirm }) => {
    // Muestra el popup de confirmación para eliminar un inventario
    const showDeleteDialog = () => {
        confirmDialog({
            message: `¿Estás seguro de que quieres eliminar este inventario?`,
            header: 'Confirmación de eliminación',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Sí, eliminar',
            rejectLabel: 'Cancelar',
            acceptClassName: 'p-button-danger',
            accept: () => onConfirm(inventoryId), // Llamar a onConfirm pasando el ID del inventario
        });
    };

    return (
        <Button
            label="Eliminar Inventario"
            icon="pi pi-trash"
            className="p-button-danger"
            onClick={showDeleteDialog} // Llamar al popup de confirmación
        />
    );
};

export default ConfirmDelInv;
