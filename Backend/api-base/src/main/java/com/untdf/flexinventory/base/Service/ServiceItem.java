package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessAttribute;
import com.untdf.flexinventory.base.Access.AccessCatalog;
import com.untdf.flexinventory.base.Access.AccessInventory;
import com.untdf.flexinventory.base.Access.AccessItem;
import com.untdf.flexinventory.base.Model.*;
import com.untdf.flexinventory.base.Resource.ResourceItem;
import com.untdf.flexinventory.base.Transferable.TransferableItem;
import com.untdf.flexinventory.base.Transferable.TransferableItemCreate;
import com.untdf.flexinventory.base.Transformer.TransformerAttribute;
import com.untdf.flexinventory.base.Transformer.TransformerInventory;
import com.untdf.flexinventory.base.Transformer.TransformerItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ServiceItem {
    @Autowired
    AccessItem access;

    @Autowired
    TransformerItem transformer;

    @Autowired
    AccessAttribute accessAttribute;

    @Autowired
    AccessCatalog accessCatalog;

    @Autowired
    AccessInventory accessInventory;

    @Autowired
    ServiceInventory serviceInventory;

    @Autowired
    TransformerInventory transformerInventory;

    @Autowired
    ServiceAttribute serviceAttribute;

    @Autowired
    TransformerAttribute transformerAttribute;

    Logger auditor = LoggerFactory.getLogger(ResourceItem.class);

    public List<TransferableItem> getAllItem(){
        return transformer.toDTOList(access.findAll());
    }

    /* Elimina un Item por el id */
    public void deleteItemById(Integer id){

        /* Si no se encuentra una entidad con el id correspondiente arroja un 404 - NOT FOUND */
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Item with id: "+ id + " was not found for delete."
            );
        }

        access.deleteById(id);
    }

    public TransferableItem createItemIventory(TransferableItemCreate transferableItem){

        Item item = new Item();

        Inventory inventory = transformerInventory.toEntity(serviceInventory.getInventoryById(transferableItem.getInventory()));
        item.setInventory(inventory);
        item.setCreation_date(new Date());
        item.setName(transferableItem.getName());

        List<ItemAttributeValue> values = new ArrayList<>();
        List<Attribute> itemAttributes = new ArrayList<>();

        for (Map.Entry<Integer, String> entry : transferableItem.getItemAtributeValue().entrySet()) { // Por cada elemento dentro del Map

            // Obtengo el attribute id
            Integer attributeId = entry.getKey();

            // Obtengo el Value
            String value = entry.getValue();

            // Creo un nuevo ItemAttribute
            ItemAttributeValue itemAttributeValue = new ItemAttributeValue();

            // Seteo el value
            itemAttributeValue.setValue(value);

            // Obtengo el atributo de la bd y lo seteo al itemAttribute
            Attribute attribute = transformerAttribute.toEntity(serviceAttribute.getAttributeById(attributeId));
            itemAttributeValue.setAttribute(attribute);
            // Establecer la relación con item
            itemAttributeValue.setItem(item);

            // Almaceno el attributo encontrado
            itemAttributes.add(attribute);

            // Añado el itemAttribute creado a la lista
            values.add(itemAttributeValue);
        }

        // Establecer los valores antes de guardar
        item.setItemsAttributeValues(values);

        Set<Integer> expectedAttributeIds = inventory.getAttributes().stream()
                .map(Attribute::getId)
                .collect(Collectors.toSet());

        Set<Integer> receivedAttributeIds = itemAttributes.stream()
                .map(Attribute::getId)
                .collect(Collectors.toSet());

        if (!expectedAttributeIds.equals(receivedAttributeIds)) {
            auditor.error("Guardado item con ID: " + item.getId());
            auditor.error("Cantidad de atributos: " + item.getItemsAttributeValues().size());
            item.getItemsAttributeValues().forEach(val -> {
                auditor.error("→ " + val.getAttribute().getName() + " = " + val.getValue());
            });

            auditor.error("Inventario con ID: " + inventory.getId());
            auditor.error("Cantidad de atributos: " + inventory.getAttributes().size());
            inventory.getAttributes().forEach(val -> {
                auditor.error("→ " + val.getName());
            });

            throw new ResponseStatusException(HttpStatus.CONFLICT, "El item no tiene los mismos atributos que el inventario");
        }

        Item newItem = access.saveAndFlush(item);

        auditor.trace("Guardado item con ID: " + newItem.getId());
        auditor.trace("Cantidad de atributos: " + newItem.getItemsAttributeValues().size());
        newItem.getItemsAttributeValues().forEach(val -> {
            auditor.trace("→ " + val.getAttribute().getName() + " = " + val.getValue());
        });

        return transformer.toDTO(newItem);
    }


    // Obtener un item por ID
    public TransferableItemCreate getItemById(Integer id){
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Item with id: "+ id + " was not found."
            );
        }
        return transformer.toDTOcreate(access.findById(id).get());
    }

}
