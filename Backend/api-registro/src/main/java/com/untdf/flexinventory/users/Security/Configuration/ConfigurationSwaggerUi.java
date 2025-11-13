package com.untdf.flexinventory.users.Security.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Clase de configuración para Swagger/OpenAPI.
 * <p>
 * Esta clase configura la documentación Swagger de la API REST de FlexInventory,
 * estableciendo el esquema de autenticación JWT (Bearer Token), metadatos de la API
 * (nombre, descripción, contacto, licencia, etc.) y otros componentes necesarios
 * para habilitar y personalizar la interfaz Swagger UI.
 * </p>
 *
 * <p>Swagger UI estará disponible para probar los endpoints protegidos
 * con JWT.</p>
 *
 * @author Milton Gómez
 */
@Configuration
public class ConfigurationSwaggerUi {

    /**
     * Crea el esquema de seguridad para JWT tipo Bearer.
     * <p>
     * Este método define un {@link SecurityScheme} de tipo HTTP
     * con formato Bearer y especifica que se espera un token JWT en la cabecera
     * Authorization de cada petición.
     * </p>
     *
     * @return un objeto {@link SecurityScheme} configurado para autenticación Bearer.
     */
    private SecurityScheme createAPIKeyScheme() {
        return new SecurityScheme().type(SecurityScheme.Type.HTTP)
                .bearerFormat("JWT")
                .scheme("bearer");
    }

    /**
     * Configura el objeto principal OpenAPI para Swagger UI.
     * <p>
     * Define el esquema de seguridad global, los metadatos de la API como
     * título y descripción, y lo registra como un bean
     * para ser utilizado por SpringDoc.
     * </p>
     *
     * @return una instancia de {@link OpenAPI} configurada.
     */
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI().addSecurityItem(new SecurityRequirement().
                        addList("Bearer Authentication"))
                .components(new Components().addSecuritySchemes
                        ("Bearer Authentication", createAPIKeyScheme()))
                .info(new Info().title("API Registro")
                        .description("Api encargada del registro/incio de sesion de Tenants.")
                        .version("1.0"));
    }
}
