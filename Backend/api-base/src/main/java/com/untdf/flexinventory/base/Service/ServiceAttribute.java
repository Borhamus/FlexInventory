package com.untdf.flexinventory.base.Service;

import com.untdf.flexinventory.base.Access.AccessAttribute;
import com.untdf.flexinventory.base.Transferable.TransferableAttribute;
import com.untdf.flexinventory.base.Transformer.TransformerAttribute;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceAttribute {

    @Autowired
    AccessAttribute access;

    @Autowired
    TransformerAttribute transformer;

    public List<TransferableAttribute> getAllAttributes(){
            return transformer.toDTOList(access.findAll());
        }

}

