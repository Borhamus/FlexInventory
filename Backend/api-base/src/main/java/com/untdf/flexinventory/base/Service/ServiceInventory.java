package com.untdf.flexinventory.base.Service;

import com.untdf.flexinventory.base.Access.AccessInventory;
import com.untdf.flexinventory.base.Transferable.TransferableInventory;
import com.untdf.flexinventory.base.Transformer.TransformerInventory;
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

    public List<TransferableInventory> getAllInventories(){
        return transformer.toDTOList(access.findAll());
    }

}
