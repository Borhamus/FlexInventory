package com.untdf.flexinventory.base.Service;

import com.untdf.flexinventory.base.Access.AccessInventory;
import com.untdf.flexinventory.base.Model.Inventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventoryCreate;
import com.untdf.flexinventory.base.Transformer.TransformerInventory;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

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

    /* Obtiene todos los inventarios */
    public List<TransferableInventory> getAllInventories(){
        return transformer.toDTOList(access.findAll());
    }

    /* Obtiene un inventario según su ID, en caso de que no exista, arroja una excepción */
    public TransferableInventory getInventoryById(Integer id){
        if (access.findById(id).isEmpty()){
            throw new EntityNotFoundException("Inventory with id: "+ id + " was not found.");
        }
        return transformer.toDTO(access.findById(id).get());
    }

    /* Busca una entidad por el id del transferible y la edita, si no encuentra la entidad, arroja una excepción */
    public TransferableInventory editInventory(TransferableInventory transferable){
        if (access.findById(transferable.getId()).isEmpty()){
            throw new EntityNotFoundException("Inventory with id: "+ transferable.getId() + " was not found.");
        }
        Inventory inventory = access.findById(transferable.getId()).get();

        inventory.setId(transferable.getId());
        inventory.setName(transferable.getName());
        inventory.setDescription(transferable.getDescription());
        inventory.setRevision_date(transferable.getRevision_date());
        inventory.setCreation_date(transferable.getCreation_date());

        access.save(inventory);

        return transformer.toDTO(inventory);
    }

    /* Elimina un inventario por el id */
    public void deleteInventoryById(Integer id){
        access.deleteById(id);
    }

    /* Crea un inventario */
    public TransferableInventory createInventory(TransferableInventoryCreate transferable){
        Inventory inventoryCreated = access.save(transformer.toEntity(transferable));
        return transformer.toDTO(inventoryCreated);
    }

}
