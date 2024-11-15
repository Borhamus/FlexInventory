package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessItem;
import com.untdf.flexinventory.base.Model.Item;
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


    public TransferableItem createItem(TransferableItemCreate transferable){
        Item itemCreated = access.save(transformer.toEntity(transferable));
        return transformer.toDTO(itemCreated);
    }


}
