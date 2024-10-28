package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessTag;
import com.untdf.flexinventory.base.Transferable.TransferableTag;
import com.untdf.flexinventory.base.Transformer.TransformerTag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceTag {
    @Autowired
    AccessTag access;

    @Autowired
    TransformerTag transformer;

    public List<TransferableTag> getAllTags(){return transformer.toDTOList(access.findAll());}

}
