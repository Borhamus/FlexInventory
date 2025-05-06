package com.untdf.flexinventory.base.Handler;

// De esta interfaz heredan todos los atributos que tienen un comportamiento complejo

public interface AttributeTypeHandler {
    String getHandledType();
    void onAttributeUsed();
    void onAttributeAdded();
    void onItemInserted();
    void onValidation();
}
