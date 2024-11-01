package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessCatalog;
import com.untdf.flexinventory.base.Transferable.TransferableCatalog;
import com.untdf.flexinventory.base.Transformer.TransformerCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceCatalog {
    @Autowired
    AccessCatalog access;

    @Autowired
    TransformerCatalog transformer;

    public List<TransferableCatalog> getAllCatalog(){return transformer.toDTOList(access.findAll());}

}
