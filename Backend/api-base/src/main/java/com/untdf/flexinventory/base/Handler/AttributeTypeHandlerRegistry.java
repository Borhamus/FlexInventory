package com.untdf.flexinventory.base.Handler;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AttributeTypeHandlerRegistry {
    private final Map<String, AttributeTypeHandler> handlers = new HashMap<>();

    // Spring inyecta automáticamente todos los beans que implementen AttributeTypeHandler
    public AttributeTypeHandlerRegistry(List<AttributeTypeHandler> handlerList) {
        for (AttributeTypeHandler handler : handlerList) {
            register(handler.getHandledType(), handler);
        }
    }
    public void register(String typeName, AttributeTypeHandler handler) {
        handlers.put(typeName.toUpperCase(), handler);
    }

    public Optional<AttributeTypeHandler> getHandler(String typeName) {
        return Optional.ofNullable(handlers.get(typeName.toUpperCase()));
    }
}