package com.untdf.flexinventory.base.Service;

import com.untdf.flexinventory.base.Access.AccessInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transformer.TransformerInventory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceInventory {

    @Autowired
    AccessInventory access;

    @Autowired
    TransformerInventory transformer;

    public List<TransferableInventory> getAllInventories(){
        return transformer.toDTOList(access.findAll());
    }

}
