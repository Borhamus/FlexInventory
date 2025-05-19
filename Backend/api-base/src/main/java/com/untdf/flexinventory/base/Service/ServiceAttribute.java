package com.untdf.flexinventory.base.Service;

import com.untdf.flexinventory.base.Access.AccessAttribute;
import com.untdf.flexinventory.base.Model.Attribute;
import com.untdf.flexinventory.base.Transferable.TransferableAttribute;
import com.untdf.flexinventory.base.Transferable.TransferableAttributeCreate;
import com.untdf.flexinventory.base.Transformer.TransformerAttribute;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ServiceAttribute {

    @Autowired
    AccessAttribute access;

    @Autowired
    TransformerAttribute transformer;

    // OBTENER TODOS LOS ATRIBUTOS

    public List<TransferableAttribute> getAllAttributes(){
        return transformer.toDTOList(access.findAll());
    }

    // OBTENER ATRIBUTO
    public TransferableAttribute getAttributeById(Integer id) {

        if (access.findById(id).isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Attribute with id: " + id + " was not found."
            );
        }

        return transformer.toDTO(access.findById(id).get());
    }

    // EDITAR ATRIBUTO
    public TransferableAttribute editAttribute(TransferableAttribute transferable){

        if (access.findById(transferable.getId()).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Attribute with id: "+ transferable.getId() + " was not found for edit."
            );
        }

        Attribute attribute = access.findById(transferable.getId()).get();

        attribute.setName(transferable.getName());
        attribute.setType(transferable.getType());

        access.save(attribute);

        return transformer.toDTO(attribute);
    }

    // ELIMINAR UN ATRIBUTO
    public void deleteAttributeById(Integer id){

        if (access.findById(id).isEmpty()){
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Attribute with id: "+ id + " was not found for delete."
            );
        }

        access.deleteById(id);
    }

    // CREAR UN ATRIBUTO
    public TransferableAttribute createAttribute(TransferableAttributeCreate transferable){
        Attribute attributeCreated = access.save(transformer.toEntity(transferable));
        return transformer.toDTO(attributeCreated);
    }

}
