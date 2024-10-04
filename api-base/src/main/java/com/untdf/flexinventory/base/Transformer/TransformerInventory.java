package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.inventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TransformerInventory {

    TransferableInventory toDTO (inventory inventory);
    inventory toEntity (TransferableInventory transferableInventory);

    List<TransferableInventory> toDTOList (List<inventory> inventoryList);
    List<inventory> toEntityList (List<TransferableInventory> transferableInventoryList);
}
