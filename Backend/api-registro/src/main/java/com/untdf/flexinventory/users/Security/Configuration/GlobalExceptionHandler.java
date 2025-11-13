package com.untdf.flexinventory.users.Security.Configuration;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;


/**
 * Manejador global de excepciones para la aplicación.
 * <p>
 * Esta clase intercepta excepciones lanzadas desde los controladores
 * y permite retornar respuestas personalizadas y estructuradas.
 * </p>
 *
 * @author Milton Gómez
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Maneja excepciones del tipo {@link ResponseStatusException}.
     * <p>
     * Crea una respuesta personalizada en formato JSON con el código de estado
     * y el mensaje de error. Esto permite al front
     * recibir errores comprensibles y bien estructurados.
     * </p>
     *
     * @param ex la excepción lanzada
     * @return una {@link ResponseEntity} con el cuerpo en formato Map y el código HTTP correspondiente
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(ResponseStatusException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("status", String.valueOf(ex.getStatusCode().value()));
        error.put("error", String.valueOf(ex.getStatusCode().toString()));

        // Si recibo un ResponseStatusException con una excepcion la tomo
        if(ex.getCause().getMessage() != null){
            error.put("message", ex.getReason() + " " + ex.getCause().getMessage());
        }
        else{
            error.put("message", ex.getReason());
        }

        return new ResponseEntity<>(error, ex.getStatusCode());
    }
}
