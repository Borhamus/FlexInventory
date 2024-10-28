package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Tag;
import com.untdf.flexinventory.base.Model.inventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableTag;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TransformerTag {

    TransferableTag toTDO (Tag Tag );
    Tag toEntity (TransferableTag transferableTag);

    List<TransferableTag> toDTOList (List<Tag> inventoryTag);
    List<Tag> toEntityList (List<TransferableTag> transferableTagList);
}

