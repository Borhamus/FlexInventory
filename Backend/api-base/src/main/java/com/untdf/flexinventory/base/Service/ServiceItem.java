package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessAttribute;
import com.untdf.flexinventory.base.Access.AccessCatalog;
import com.untdf.flexinventory.base.Access.AccessInventory;
import com.untdf.flexinventory.base.Access.AccessItem;
import com.untdf.flexinventory.base.Model.*;
import com.untdf.flexinventory.base.Transferable.TransferableItem;
import com.untdf.flexinventory.base.Transferable.TransferableItemCreate;
import com.untdf.flexinventory.base.Transformer.TransformerItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ServiceItem {
    @Autowired
    AccessItem access;
    @Autowired
    TransformerItem transformer;
    @Autowired
    AccessAttribute accessAttribute;
    @Autowired
    AccessCatalog accessCatalog;
    @Autowired
    AccessInventory accessInventory;


    /* Elimina un Item por el id */
    public void deleteItemById(Integer id){

        /* Si no se encuentra una entidad con el id correspondiente arroja un 404 - NOT FOUND */
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Inventory with id: "+ id + " was not found for delete."
            );
        }

        access.deleteById(id);
    }

    public TransferableItem createItem(TransferableItemCreate transferableItem){

        //Creo una instancia de una nueva entidad
        Item item = new Item();

        //Le inserto los datos de creación
        item = transformer.toEntity(transferableItem);

        if(transferableItem.getInventory() != null && transferableItem.getInventory() > 0){

            if (accessInventory.findById(transferableItem.getInventory()).isEmpty()){
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Inventory with id: "+ transferableItem.getInventory() + " was not found."
                );
            }

            Inventory inventory = accessInventory.findById(transferableItem.getInventory()).get();
            item.setInventory(inventory);
        }

        // Una vez que la entidad ha sido guardada en la base de datos, se convierte nuevamente en un DTO y este es retornado
        return transformer.toDTO(item);
    }



}
