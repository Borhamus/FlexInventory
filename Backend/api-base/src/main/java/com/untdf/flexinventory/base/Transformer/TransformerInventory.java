package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Inventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring", uses = {TransformerAttribute.class, TransformerItem.class})
public interface TransformerInventory {
    
    TransferableInventory toDTO (Inventory inventory);

    Inventory toEntity (TransferableInventory transferableInventory);

    Inventory toEntity(TransferableInventoryCreate transferableInventoryCreate);

    List<TransferableInventory> toDTOList (List<Inventory> inventoryList);
    List<Inventory> toEntityList (List<TransferableInventory> transferableInventoryList);
}
