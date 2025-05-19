package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessAttribute;
import com.untdf.flexinventory.base.Access.AccessCatalog;
import com.untdf.flexinventory.base.Access.AccessInventory;
import com.untdf.flexinventory.base.Access.AccessItem;
import com.untdf.flexinventory.base.Handler.AttributeTypeHandler;
import com.untdf.flexinventory.base.Handler.AttributeTypeHandlerRegistry;
import com.untdf.flexinventory.base.Model.Attribute;
import com.untdf.flexinventory.base.Model.Inventory;
import com.untdf.flexinventory.base.Model.Item;
import com.untdf.flexinventory.base.Model.ItemAttributeValue;
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

    @Autowired
    AttributeTypeHandlerRegistry registry;

    Logger auditor = LoggerFactory.getLogger(ResourceItem.class);

    /**
     * Recupera y transforma todos los ítems almacenados en el sistema.
     *
     * @return una lista de objetos {@code TransferableItem} que representan los ítems disponibles.
     */
    public List<TransferableItem> getAllItem(){
        return transformer.toDTOList(access.findAll());
    }

    /**
     * Elimina un ítem del sistema según su identificador único.
     *
     * @param id el identificador del ítem a eliminar.
     * @throws ResponseStatusException si el ítem con el ID proporcionado no existe (HTTP 409).
     */
    public void deleteItemById(Integer id){

        /* Si no se encuentra una entidad con el id correspondiente arroja un 404 - NOT FOUND */
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Item with id: "+ id + " was not found for delete."
            );
        }

        access.deleteById(id);
    }

    /**
     * Crea un nuevo ítem en un inventario específico, validando que los atributos provistos coincidan
     * con los definidos por el inventario.
     *
     * También establece relaciones entre el ítem y sus atributos, aplicando validaciones de integridad lógica.
     *
     * @param transferableItem objeto DTO con los datos necesarios para la creación del ítem.
     * @return el ítem creado, representado como un {@code TransferableItem}.
     * @throws ResponseStatusException si los atributos provistos no coinciden con los del inventario (HTTP 409).
     */
    public TransferableItem createItemIventory(TransferableItemCreate transferableItem){

        // Creo una nueva instancia de la entidad de Item
        Item item = new Item();

        // Obtengo la entidad Inventario desde el transferible del item
        Inventory inventory = transformerInventory.toEntity(serviceInventory.getInventoryById(transferableItem.getInventory()));

        // Le asigno el inventario, la fecha y el nombre a la instancia nueva del Item
        item.setInventory(inventory);
        item.setCreation_date(new Date());
        item.setName(transferableItem.getName());

        // Creo instancias para los valores y los item-atributes
        List<ItemAttributeValue> values = new ArrayList<>();
        List<Attribute> itemAttributes = new ArrayList<>();

        // Por cada Entrada con <Llave Integer y tipo de Dato String> en el itemAtributeValue del transferible del item...
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

            // Si el Tipo del Atributo posee un handler lo ejecuto.
            Optional<AttributeTypeHandler> handlerOptional = registry.getHandler(attribute.getType());
            System.out.println("Atributo del tipo: " + attribute.getType());
            // Los :: siempre me confunden pero es una forma abreviada de escribir handler -> handler.onItemInserted()
            handlerOptional.ifPresent(AttributeTypeHandler::onItemInserted);

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


    /**
     * Obtiene los datos de un ítem específico a partir de su identificador único.
     *
     * @param id el identificador del ítem que se desea recuperar.
     * @return un objeto {@code TransferableItemCreate} con la información del ítem encontrado.
     * @throws ResponseStatusException si el ítem no existe en el sistema (HTTP 404).
     */
    public TransferableItem getItemById(Integer id){
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Item with id: "+ id + " was not found."
            );
        }
        return transformer.toDTO(access.findById(id).get());
    }

}
