package com.untdf.flexinventory.base.Handler;


/**
 * Esta interfaz debe ser implementada por todos los tipos de atributos que posean un comportamiento complejo
 * dentro del sistema FlexInventory. Permite definir comportamientos personalizados para eventos relacionados
 * con atributos cuando son utilizados, agregados o validados.
 */
public interface AttributeTypeHandler {

    /**
     * Devuelve el nombre del tipo de dato que maneja este handler.
     *
     * @return el tipo de dato como una cadena.
     */
    String getHandledType();

    /**
     * Método invocado cuando el atributo es utilizado de alguna forma.
     * Útil para ejecutar una función específica relacionada al uso del atributo.
     */
    void onAttributeUsed();

    /**
     * Método invocado cuando el atributo es añadido a un catálogo o inventario existente.
     */
    void onAttributeAdded();

    /**
     * Método invocado cuando un ítem que contiene este atributo es insertado en un catálogo o inventario.
     */
    void onItemInserted();

    /**
     * Método invocado para validar el estado o valor del atributo.
     * El uso específico depende del tipo de atributo implementado.
     */
    void onValidation();
}