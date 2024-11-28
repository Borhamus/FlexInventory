package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Item;
import com.untdf.flexinventory.base.Transferable.TransferableItem;
import com.untdf.flexinventory.base.Transferable.TransferableItemCreate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring", uses = TransformerAttribute.class)
public interface TransformerItem {

    TransferableItem toDTO (Item item);

    @Mapping(target = "inventory", ignore = true)
    @Mapping(target = "catalogs", ignore = true)
    @Mapping(target = "attributeItems", ignore = true)
    Item toEntity(TransferableItemCreate transferableItemCreate);
    Item toEntity (TransferableItem transferableItem);

    @Mapping(target = "inventory", ignore = true)
    List<TransferableItem> toDTOList (List<Item> ItemList);
    List<Item> toEntityList (List<TransferableItem> transferableItemList);


}
