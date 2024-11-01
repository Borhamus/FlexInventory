package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Attribute;
import com.untdf.flexinventory.base.Model.AttributeInventory;
import com.untdf.flexinventory.base.Model.Inventory;
import com.untdf.flexinventory.base.Transferable.TransferableAttribute;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", uses = TransformerAttribute.class)
public interface TransformerInventory {

    @Mapping(target = "attributes", source = "attributes")
    TransferableInventory toDTO (Inventory inventory);

    Inventory toEntity (TransferableInventory transferableInventory);

    Inventory toEntity(TransferableInventoryCreate transferableInventoryCreate);

    List<TransferableInventory> toDTOList (List<Inventory> inventoryList);
    List<Inventory> toEntityList (List<TransferableInventory> transferableInventoryList);
}
