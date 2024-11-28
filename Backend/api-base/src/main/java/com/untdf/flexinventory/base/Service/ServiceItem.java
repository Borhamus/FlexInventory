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
import org.springframework.stereotype.Service;

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


    public TransferableItem createItem(TransferableItemCreate transferableItem){
        // Convierte el objeto de transferencia (DTO) "transferable" en una entidad "Item" utilizando el metodo toEntity del transformer y lo almacena en la BDD.
        Item itemCreated = access.save(transformer.toEntity(transferableItem));
        // Una vez que la entidad ha sido guardada en la base de datos, se convierte nuevamente en un DTO y este es retornado
        return transformer.toDTO(itemCreated);
    }


}
