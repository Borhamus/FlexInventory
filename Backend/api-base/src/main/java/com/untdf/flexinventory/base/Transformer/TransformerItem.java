package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Item;
import com.untdf.flexinventory.base.Model.ItemAttributeValue;
import com.untdf.flexinventory.base.Transferable.TransferableAttributeValue;
import com.untdf.flexinventory.base.Transferable.TransferableItem;
import com.untdf.flexinventory.base.Transferable.TransferableItemCreate;
import com.untdf.flexinventory.base.Transferable.TransferableItemInventory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", uses = {TransformerAttribute.class, TransformerAttributeValue.class})
public interface TransformerItem {

    @Mapping(target = "inventory", ignore = false)
    @Mapping(target = "itemsAttributeValues", source = "itemsAttributeValues")
    TransferableItem toDTO (Item item);

    @Mapping(target = "itemsAttributeValues", source = "itemsAttributeValues")
    TransferableItemInventory toDTOItemInventory (Item item);

    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "catalogs", ignore = true)
    Item toEntity(TransferableItemCreate transferableItemCreate);

    Item toEntity (TransferableItem transferableItem);

    @Mapping(target = "inventory", ignore = true)
    List<TransferableItem> toDTOList (List<Item> ItemList);
    List<Item> toEntityList (List<TransferableItem> transferableItemList);

    @Mapping(target = "inventory", ignore = true)
    TransferableItemCreate toDTOcreate (Item item);
}
