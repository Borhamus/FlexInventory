package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Inventory;
import com.untdf.flexinventory.base.Model.Item;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableItem;
import com.untdf.flexinventory.base.Transferable.TransferableItemCreate;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring", uses = TransformerAttribute.class)
public interface TransformerItem {
    TransferableItem toDTO (Item item);

    Item toEntity (TransferableItem transferableItem);
    Item toEntity(TransferableItemCreate transferableItemCreate);

    List<TransferableItem> toDTOList (List<Item> ItemList);
    List<Item> toEntityList (List<TransferableItem> transferableItemList);


}
