package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Attribute;
import com.untdf.flexinventory.base.Model.AttributeInventory;
import com.untdf.flexinventory.base.Transferable.TransferableAttribute;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper (componentModel = "spring")
public interface TransformerAttribute {

    TransferableAttribute toDTO (Attribute Attribute);
    Attribute toEntity (TransferableAttribute transferableAttribute);

    @Mapping(target = "id", source = "attribute.id")
    @Mapping(target = "type", source = "attribute.type")
    @Mapping(target = "name", source = "attribute.name")
    TransferableAttribute toDTO(AttributeInventory attributeInventory);

    List<TransferableAttribute> toDTOList (List<Attribute> attributeList);
    List<Attribute> toEntity (List<TransferableAttribute> transferableAttributes);

}
