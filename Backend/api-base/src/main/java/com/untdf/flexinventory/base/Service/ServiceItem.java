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

import java.util.ArrayList;
import java.util.List;

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


    public TransferableItem createItem(TransferableItemCreate transferable){
        return null;

    }


}
