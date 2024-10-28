package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Attribute;
import com.untdf.flexinventory.base.Transferable.TransferableAttribute;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper (componentModel = "spring")
public interface TransformerAttribute {

    TransferableAttribute toDTO (Attribute Attribute);
    Attribute toEntity (TransferableAttribute transferableAttribute);

    List<TransferableAttribute> toDTOList (List<Attribute> attributeList);
    List<Attribute> toEntity (List<TransferableAttribute> transferableAttributes);

}
