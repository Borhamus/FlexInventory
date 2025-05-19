package com.untdf.flexinventory.base.Service;


import com.untdf.flexinventory.base.Access.AccessInventory;
import com.untdf.flexinventory.base.Handler.AttributeTypeHandler;
import com.untdf.flexinventory.base.Handler.AttributeTypeHandlerRegistry;
import com.untdf.flexinventory.base.Model.Attribute;
import com.untdf.flexinventory.base.Model.Inventory;
import com.untdf.flexinventory.base.Resource.ResourceItem;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import com.untdf.flexinventory.base.Transformer.TransformerAttribute;
import com.untdf.flexinventory.base.Transformer.TransformerInventory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

/**
 * Aqui vemos como a través de la etiqueta @Autowired se relaciona la clase <code>ServiceInventory</code> con <code>AccessInventory</code>
 * sin necesidad de instanciar una clase, esto es parte del patrón "Injection Dependency", esto se cumple para el transformador también.
 * <p>
 * Podemos ver también como al hacer uso de access este provee el metodo findAll() el cual es provisto por JpaRepository.
 * @Author Milton Gómez.
 */

@Service
public class ServiceInventory {

    @Autowired
    AccessInventory access;

    @Autowired
    TransformerInventory transformer;

    @Autowired
    ServiceAttribute serviceAttribute;

    @Autowired
    TransformerAttribute transformerAttribute;

    @Autowired
    AttributeTypeHandlerRegistry registry;

    Logger auditor = LoggerFactory.getLogger(ResourceItem.class);

    /* Obtiene todos los inventarios */
    public List<TransferableInventory> getAllInventories(){
        return transformer.toDTOList(access.findAll());
    }

    /* Obtiene un inventario según su ID, en caso de que no exista, arroja una excepción */
    public TransferableInventory getInventoryById(Integer id){

        /* Si no se encuentra una entidad con el id correspondiente arroja un 404 - NOT FOUND */
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Inventory with id: "+ id + " was not found."
            );
        }

        return transformer.toDTO(access.findById(id).get());
    }

    /* Busca una entidad por el id del transferible y la edita, si no encuentra la entidad, arroja una excepción */
    public TransferableInventory editInventory(TransferableInventory transferable){

        /* Si no se encuentra una entidad con el id correspondiente arroja un 404 - NOT FOUND */
        if (access.findById(transferable.getId()).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Inventory with id: "+ transferable.getId() + " was not found for edit."
            );
        }

        Inventory inventory = access.findById(transferable.getId()).get();

        inventory.setName(transferable.getName());
        inventory.setDescription(transferable.getDescription());
        inventory.setRevision_date(transferable.getRevision_date());
        inventory.setCreation_date(transferable.getCreation_date());

        access.save(inventory);

        return transformer.toDTO(inventory);
    }

    /* Elimina un inventario por el id */
    public void deleteInventoryById(Integer id){

        /* Si no se encuentra una entidad con el id correspondiente arroja un 404 - NOT FOUND */
        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Inventory with id: "+ id + " was not found for delete."
            );
        }

        access.deleteById(id);
    }

    /**
     * Crea un nuevo Inventario vinculando este y sus atributos.
     * En caso de que uno de sus atributos posea un Handler, lo ejecuta utilizando onAttributeAdded().
     *
     * @param transferable objeto DTO con los datos necesarios para la creación del Inventario.
     * @return el Inventario creado, representado como un {@code TransferableInventory}.
     */
    public TransferableInventory createInventory(TransferableInventoryCreate transferable){

        Inventory inventory=transformer.toEntity(transferable);

        //Obtengo la fecha actual
        inventory.setCreation_date(new Date());

        List<Attribute> atributeList = new ArrayList<>();
        for(Integer id : transferable.getAttributesIds()){

            // Obtengo el atributo de la BD
            Attribute attribute = transformerAttribute.toEntity(serviceAttribute.getAttributeById(id));

            // Si el Tipo del Atributo posee un handler lo ejecuto.
            Optional<AttributeTypeHandler> handlerOptional = registry.getHandler(attribute.getType());
            auditor.info("Atributo del tipo: {}", attribute.getType());

            // Los :: siempre me confunden pero es una forma abreviada de escribir handler -> handler.onItemInserted()
            // Si tiene un Handler, ejecuta la acción onAttributeAdded
            handlerOptional.ifPresent(AttributeTypeHandler::onAttributeAdded);

            // Añado el atributo a la Lista
            atributeList.add(attribute);
        }

        // Seteo la lista de atributos al Inventario
        inventory.setAttributes(atributeList);

        // Persisto el inventario
        Inventory inventoryCreated = access.save(inventory);
        return transformer.toDTO(inventoryCreated);
    }

}
