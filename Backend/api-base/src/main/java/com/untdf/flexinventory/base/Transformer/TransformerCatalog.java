package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Catalog;
import com.untdf.flexinventory.base.Model.CatalogItem;
import com.untdf.flexinventory.base.Model.Item;
import com.untdf.flexinventory.base.Transferable.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TransformerCatalog {

    TransferableCatalog toDTO (Catalog Catalog);
    List<TransferableCatalog> toDTOList (List<Catalog> catalogList);


    @Mapping(target = "itemsAttributeValues", source = "itemsAttributeValues")
    TransferableItemCatalog toDTO (Item item);
    
    TransferableCatalogItem toDTO (CatalogItem catalogItem);

    Catalog toEntity (TransferableCatalog transferableCatalog);
    List<Catalog> toEntityList (List<TransferableCatalog> transferableCatalogList);

    Catalog toEntityCreate (TransferableCatalogCreate transferableCatalogCreate);
}