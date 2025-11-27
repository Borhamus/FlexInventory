package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessCatalog;
import com.untdf.flexinventory.base.Access.AccessCatalogItem;
import com.untdf.flexinventory.base.Access.AccessItem;
import com.untdf.flexinventory.base.Model.Catalog;
import com.untdf.flexinventory.base.Model.CatalogItem;
import com.untdf.flexinventory.base.Model.Item;
import com.untdf.flexinventory.base.Transferable.TransferableCatalog;
import com.untdf.flexinventory.base.Transferable.TransferableCatalogCreate;
import com.untdf.flexinventory.base.Transformer.TransformerCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class ServiceCatalog {

    @Autowired
    AccessCatalog access;
    @Autowired
    AccessCatalogItem accessCatalogItem;
    @Autowired
    AccessItem accessItem;
    @Autowired
    TransformerCatalog transformer;

    /* Obtiene todos los Catalogos */
    public List<TransferableCatalog> getAllCatalog(){
        return transformer.toDTOList(access.findAll());
    }

    /* OBTIENE UN CATALOGO POR ID */

    public TransferableCatalog getCatalogById(Integer id)
    {
        if (access.findById(id).isEmpty())  /* Si no se encuentra la entidad arroja un 404 - NOT FOUND */
        {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Catalog with id: "+ id + " was not found."
            );
        }
        return transformer.toDTO(access.findById(id).get());
    }

    /* ELIMINAR UN CATALOGO POR ID */
    public void deleteCatalogById(Integer id)
    {
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Catalog with id: "+ id + " was not found for delete."
            );
        }

        access.deleteById(id);
    }

    /* BUSCA UNA IDENTIDAD Y LA ACTULIZA */
    public TransferableCatalog editCatalog(TransferableCatalog transferable){

        /* Si no se encuentra una entidad con el id correspondiente arroja un 404 - NOT FOUND */
        if (access.findById(transferable.getId()).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Catalog with id: "+ transferable.getId() + " was not found for edit."
            );
        }

        Catalog catalog = access.findById(transferable.getId()).get();

        catalog.setName(transferable.getName());
        catalog.setDescription(transferable.getDescription());
        catalog.setRevision_date(transferable.getRevision_date());
        catalog.setCreation_date(transferable.getCreation_date());
        access.save(catalog);
        return transformer.toDTO(catalog);
    }

    public void addItemsInCatalog(int idCatalogo,List<Integer> idItems){
        Optional<Catalog> catalog = access.findById(idCatalogo);
        if (catalog.isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Catalog with id: "+ idCatalogo + " was not found for edit."
            );
        }
        List<Item> items = new ArrayList<>();
        for (int IDitem : idItems) {
            Optional<Item> item = accessItem.findById(IDitem);
            if (item.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item with id: " + IDitem + " was not found ."
                );
            }
            items.add(item.get());
        }
        Catalog catalogoDestino = catalog.get();
        for(Item item : items){
            if (!catalogoDestino.getItems().contains(item)){
                CatalogItem catalogItem = new CatalogItem();
                catalogItem.setCatalog(catalogoDestino);
                catalogItem.setOrganisation(null);
                catalogItem.setItem(item);
                accessCatalogItem.save(catalogItem);
            }
        }
    }

    public void removeItemfromCatalog(int idCatalogo,List<Integer> idItems){
        if (access.findById(idCatalogo).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Catalog with id: "+ idCatalogo + " was not found for edit."
            );
        }
        int FilasAfectadas = accessCatalogItem.deleteItemsFromCatalog(idCatalogo,idItems);
        if (FilasAfectadas != idItems.size()){
            if (FilasAfectadas == 0){
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No items were removed, not found this items on this catalog"
                );
            }
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Only " + FilasAfectadas + " of " + idItems.size() + " items were removed."
            );
        }
    }

    public void moveItemsFromCatalogs(int idCatalogoOrigen,int idCatalogoDestino,List<Integer>idItems){
        if (access.findById(idCatalogoOrigen).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Catalog with id: "+ idCatalogoOrigen + " was not found for edit."
            );
        }
        if (access.findById(idCatalogoDestino).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Catalog with id: "+ idCatalogoDestino + " was not found for edit."
            );
        }
        removeItemfromCatalog(idCatalogoOrigen,idItems);
        addItemsInCatalog(idCatalogoDestino,idItems);
    }

    /* CREA UN CATALOGO */
    public TransferableCatalog createCatalog(TransferableCatalogCreate transferable){

        Catalog catalog = transformer.toEntityCreate(transferable);

        // asigno la fecha de creación a la fecha de hoy.
        catalog.setCreation_date(new Date());


        Catalog catalogCreated = access.save(catalog);
        return transformer.toDTO(catalogCreated);
    }
}
