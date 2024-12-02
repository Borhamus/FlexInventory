package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.InventoryAttribute;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryAttribute;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TransformerInventoryAttribute {
    TransferableInventoryAttribute toDTO(InventoryAttribute inventoryAttribute);

    List<TransferableInventoryAttribute> toDTOList( List<InventoryAttribute> inventoryAttribute );

}

