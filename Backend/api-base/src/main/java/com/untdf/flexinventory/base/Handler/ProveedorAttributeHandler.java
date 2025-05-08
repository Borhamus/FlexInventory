package com.untdf.flexinventory.base.Handler;

import com.untdf.flexinventory.base.Resource.ResourceItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ProveedorAttributeHandler implements AttributeTypeHandler {

    Logger auditor = LoggerFactory.getLogger(ResourceItem.class);

    @Override
    public String getHandledType(){
        return "PROVEEDOR";
    }

    @Override
    public void onAttributeUsed(){
    };

    @Override
    public void onAttributeAdded(){

    };

    @Override
    public void onItemInserted(){
        auditor.info("--------------| NUEVO HANDLER DE PROVEEDOR |--------------");
        auditor.info("SE RELACIONA ESTE ITEM CON ALGÚN ELEMENTO DEL INVENTARIO PROVEEDORES");
    };

    @Override
    public void onValidation(){
    };

}
