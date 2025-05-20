package com.untdf.flexinventory.base.Security.Jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    Logger auditor = LoggerFactory.getLogger(JwtFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // Obtengo el header de Authorization
        final String authHeader = request.getHeader("Authorization");
        auditor.info("------------ Header Authorization: " + authHeader);

        // Si el token no está vacio y es comienza con Bearer
        if (authHeader != null && authHeader.startsWith("Bearer ")) {

            // Obtengo el token pero elimino de el medio a "Bearer "
            String token = authHeader.substring(7);

            if (jwtUtil.validarToken(token)) { // Valido si la firma es correcta.
                String username = jwtUtil.extraerUsername(token);

                UserDetails userDetails = User
                        .withUsername(username)
                        .password("") // no importa porque no se usa
                        .authorities(new ArrayList<>()) // TODO: Cargar los roles desde el token
                        .build();

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        chain.doFilter(request, response);
    }
}

