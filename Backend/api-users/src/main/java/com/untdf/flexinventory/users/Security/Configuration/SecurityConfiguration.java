package com.untdf.flexinventory.users.Security.Configuration;

import com.untdf.flexinventory.users.Security.Jwt.JwtFilter;
import com.untdf.flexinventory.users.Service.ServiceUserDetail;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuración principal de seguridad para la API base de FlexInventory.
 * <p>
 * Esta clase configura las reglas de seguridad HTTP para la aplicación,
 * incluyendo:
 * <ul>
 * <li>Desactivación de CSRF (no se usa con JWT).</li>
 * <li>Protección de endpoints y definición de rutas públicas.</li>
 * <li>Aplicación de filtros JWT para autenticación.</li> >>JWT: Json Web Token
 * <li>Política de sesión sin estado (stateless).</li>
 * </ul>
 * </p>
 *
 * <p>
 * Además, define las reglas de configuración de CORS necesarias >> CORS:
 * Cross-Origin Resource Sharing
 * para permitir la comunicación entre el backend y el cliente React.
 * </p>
 *
 * @author Milton Gomez
 */
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    /**
     * Filtro JWT que se ejecuta antes del filtro de autenticación por nombre de
     * usuario y contraseña.
     * Se encarga de validar el token JWT en cada solicitud.
     */
    @Autowired
    private JwtFilter jwtFilter;

    /**
     * Servicio encargado de cargar los detalles del usuario desde la base de datos.
     * Usado por Spring Security para la autenticación.
     */
    @Autowired
    private ServiceUserDetail serviceUserDetail;

    /**
     * Define la cadena de filtros de seguridad para las peticiones HTTP.
     * <p>
     * Se configuran las siguientes reglas:
     * <ul>
     * <li>Se permite acceso sin autenticación a rutas públicas como /auth/** y
     * documentación Swagger.</li>
     * <li>Se exige autenticación para el resto de los endpoints.</li>
     * <li>Se aplica el filtro JWT antes del filtro de autenticación de Spring
     * Security.</li>
     * <li>Se configura el manejo de sesiones como STATELESS (sin sesiones
     * HTTP).</li>
     * </ul>
     * </p>
     *
     * @param http instancia de configuración de {@link HttpSecurity}
     * @return {@link SecurityFilterChain} configurado para Spring Security
     * @throws Exception si ocurre un error en la construcción de la cadena de
     *                   filtros
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults()) // Permitimos el CORS
                .csrf(csrf -> csrf.disable()) // Desactivamos el csrf ya que no lo usamos nosotros
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers( // Permitimos el acceso libre a todas las siguientes rutas...
                                "/auth/**", // Registro/Inicio de sesión
                                "/v3/api-docs/**", //
                                "/swagger-ui/**", // Openapi y Swagger
                                "/swagger-ui.html", //
                                "/openapi/**" //
                        ).permitAll()
                        .anyRequest().authenticated() // El resto requiere authenticacion
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // La sesión del
                                                                                                        // usuario no
                                                                                                        // posee estado
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class); // Añadimos el filtro de JWT
        return http.build();
    }

    /**
     * Configura las reglas CORS (Cross-Origin Resource Sharing) de la API.
     * <p>
     * Permite peticiones desde la aplicación React que corre en
     * <code>http://localhost:3000</code>,
     * y autoriza métodos y cabeceras típicas necesarias para operaciones seguras.
     * </p>
     *
     * @return {@link CorsConfigurationSource} con la política de CORS aplicada
     *         globalmente
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000")); // React app
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true); // si usás cookies
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Configura el gestor de autenticación de Spring Security.
     * <p>
     * Usa un {@link UserDetailsService} personalizado junto con un
     * {@link PasswordEncoder}
     * para validar las credenciales de los usuarios.
     * </p>
     *
     * @param http                  configuración de seguridad HTTP
     * @param bCryptPasswordEncoder codificador de contraseñas
     * @param userDetailsService    servicio de detalles del usuario
     * @return instancia de {@link AuthenticationManager}
     * @throws Exception si ocurre un error durante la configuración
     */
    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http, BCryptPasswordEncoder bCryptPasswordEncoder,
            UserDetailsService userDetailsService)
            throws Exception {
        return http.getSharedObject(AuthenticationManagerBuilder.class)
                .userDetailsService(serviceUserDetail)
                .passwordEncoder(bCryptPasswordEncoder)
                .and()
                .build();
    }

    /**
     * Define el codificador de contraseñas a utilizar.
     * <p>
     * Utiliza el algoritmo BCrypt para cifrar y verificar contraseñas de forma
     * segura.
     * </p>
     *
     * @return instancia de {@link BCryptPasswordEncoder}
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
