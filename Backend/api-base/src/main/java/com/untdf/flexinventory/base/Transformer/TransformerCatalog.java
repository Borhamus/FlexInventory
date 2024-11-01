package com.untdf.flexinventory.base.Transformer;

import com.untdf.flexinventory.base.Model.Catalog;
import com.untdf.flexinventory.base.Transferable.TransferableCatalog;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TransformerCatalog {

    TransferableCatalog toTDO (Catalog Catalog );
    Catalog toEntity (TransferableCatalog transferableCatalog);

    List<TransferableCatalog> toDTOList (List<Catalog> inventoryCatalog);
    List<Catalog> toEntityList (List<TransferableCatalog> transferableCatalogList);
}

