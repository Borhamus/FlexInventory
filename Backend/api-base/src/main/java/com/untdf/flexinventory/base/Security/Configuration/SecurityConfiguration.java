package com.untdf.flexinventory.base.Security.Configuration;


import com.untdf.flexinventory.base.Security.Jwt.JwtFilter;
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
 *     <li>Desactivación de CSRF (no se usa con JWT).</li>
 *     <li>Protección de endpoints y definición de rutas públicas.</li>
 *     <li>Aplicación de filtros JWT para autenticación.</li>
 *     <li>Política de sesión sin estado (stateless).</li>
 * </ul>
 * </p>
 *
 * <p>Además, define las reglas de configuración de CORS necesarias
 * para permitir la comunicación entre el backend y el cliente React.</p>
 *
 * @author Milton Gomez
 */
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    /**
     * Filtro personalizado que intercepta las peticiones para validar el JWT.
     */
    @Autowired
    private JwtFilter jwtFilter;

    /**
     * Define la cadena de filtros de seguridad para las peticiones HTTP.
     * <p>
     * Se configuran las siguientes reglas:
     * <ul>
     *     <li>Se permite acceso sin autenticación a rutas públicas como /auth/** y documentación Swagger.</li>
     *     <li>Se exige autenticación para el resto de los endpoints.</li>
     *     <li>Se aplica el filtro JWT antes del filtro de autenticación de Spring Security.</li>
     *     <li>Se configura el manejo de sesiones como STATELESS (sin sesiones HTTP).</li>
     * </ul>
     * </p>
     *
     * @param http instancia de configuración de {@link HttpSecurity}
     * @return {@link SecurityFilterChain} configurado para Spring Security
     * @throws Exception si ocurre un error en la construcción de la cadena de filtros
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable()) // Desactivamos el csrf ya que no lo usamos nosotros
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/auth/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/openapi/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Configura las reglas CORS (Cross-Origin Resource Sharing) de la API.
     * <p>
     * Permite peticiones desde la aplicación React que corre en <code>http://localhost:3000</code>,
     * y autoriza métodos y cabeceras típicas necesarias para operaciones seguras.
     * </p>
     *
     * @return {@link CorsConfigurationSource} con la política de CORS aplicada globalmente
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

}
