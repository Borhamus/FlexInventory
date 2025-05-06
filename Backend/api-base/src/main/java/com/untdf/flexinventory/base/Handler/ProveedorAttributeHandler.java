package com.untdf.flexinventory.base.Handler;

import org.springframework.stereotype.Component;

@Component
public class ProveedorAttributeHandler implements AttributeTypeHandler {

    @Override
    public String getHandledType(){
        return "PROVEEDOR";
    }

    @Override
    public void onAttributeUsed(){
        System.out.println("Si el atributo tiene alguna función y esta es utilizada este debe utilizarse.");
    };

    @Override
    public void onAttributeAdded(){
        System.out.println("Esto se debe usar cuando se añade un Atributo en el caso de que el" +
                "tipo de dato sea alterado o tenga una función cuando se añade un atributo.");
        System.out.println("SE CREA EL INVENTARIO PROVEEDORES");
    };

    @Override
    public void onItemInserted(){
        System.out.println("Esto se debe usar cuando se inserta un Item en caso de que el" +
                "tipo de dato sea alterado o tenga una función cuando se inserta un item");
        System.out.println("SE RELACIONA ESTE ITEM CON ALGÚN ELEMENTO DEL INVENTARIO PROVEEDORES");
    };

    @Override
    public void onValidation(){
        System.out.println("Cuando se quiera realizar alguna validación es lo que debe usarse.");
    };
}
