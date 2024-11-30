package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.ItemAttributeValue;
import com.untdf.flexinventory.base.Transferable.TransferableAttributeValue;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", uses = {TransformerAttribute.class})
public interface TransformerAttributeValue {

    TransferableAttributeValue toDTOIAV (ItemAttributeValue item);

    List<TransferableAttributeValue> toDTOIAVList (List<ItemAttributeValue> item);
}
