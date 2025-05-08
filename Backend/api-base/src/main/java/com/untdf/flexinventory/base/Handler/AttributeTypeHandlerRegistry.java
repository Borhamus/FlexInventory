package com.untdf.flexinventory.base.Handler;

import com.untdf.flexinventory.base.Resource.ResourceItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Registro de manejadores de atributos (handlers) utilizados por FlexInventory.
 * Esta clase permite registrar e identificar handlers de atributos según su tipo.
 * <p>
 * Todos los beans que implementen {@link AttributeTypeHandler} serán detectados automáticamente
 * por Spring e incluidos en este registro.
 */
@Component
public class AttributeTypeHandlerRegistry {

    /**
     * Mapa que asocia tipos de atributos (en mayúsculas) con sus respectivos handlers.
     */
    private final Map<String, AttributeTypeHandler> handlers = new HashMap<>();

    Logger auditor = LoggerFactory.getLogger(ResourceItem.class);

    /**
     * Constructor que recibe la lista de todos los handlers registrados como beans
     * y los registra en el mapa interno. Spring vincula los Beans que implementan la interfaz de forma autimatica
     *
     * @param handlerList lista de implementaciones de {@link AttributeTypeHandler}.
     */
    public AttributeTypeHandlerRegistry(List<AttributeTypeHandler> handlerList) {
        for (AttributeTypeHandler handler : handlerList) {
            auditor.info("--------------------| Handler Registry - Se añade el atributo: {} |--------------------", handler.getHandledType());
            register(handler.getHandledType(), handler);
        }
    }

    /**
     * Registra un nuevo handler para un tipo de atributo.
     *
     * @param typeName nombre del tipo de atributo.
     * @param handler  instancia del handler correspondiente.
     */
    public void register(String typeName, AttributeTypeHandler handler) {
        handlers.put(typeName.toUpperCase(), handler);
    }


    /**
     * Obtiene el handler correspondiente a un tipo de atributo.
     *
     * @param typeName nombre del tipo de atributo.
     * @return un {@link Optional} conteniendo el handler, si existe.
     */
    public Optional<AttributeTypeHandler> getHandler(String typeName) {
        return Optional.ofNullable(handlers.get(typeName.toUpperCase()));
    }
}