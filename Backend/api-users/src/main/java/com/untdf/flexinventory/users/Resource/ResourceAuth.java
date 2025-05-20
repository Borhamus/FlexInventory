package com.untdf.flexinventory.users.Resource;

import com.untdf.flexinventory.users.Security.Jwt.JwtUtil;
import com.untdf.flexinventory.users.Service.ServiceAuth;
import com.untdf.flexinventory.users.Transferable.TransferableJWT;
import com.untdf.flexinventory.users.Transferable.TransferableLoginForm;
import com.untdf.flexinventory.users.Transferable.TransferableRegisterForm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
@CrossOrigin("*")
@Tag(name = "Authentication Endpoint.", description = "Operations related to authentication, Login, Register, obtainToken, etc.")
public class ResourceAuth {
    @Autowired
    private ServiceAuth authService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    Logger auditor = LoggerFactory.getLogger(ResourceAuth.class);

    // - OPERACION Y RESPUESTA
    @Operation(summary = "Logs in into the application")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "If the login is successful then returns a token.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = TransferableJWT.class))),
            @ApiResponse(
                    responseCode = "403",
                    description = "The authentication failed, no token is returned",
                    content = @Content() /* No content for 401 */
            ),
            @ApiResponse(
                    responseCode = "500",
                    description = "Internal server error, check header response.",
                    content = @Content() /* No content for 500 */
            )
    })
    @PostMapping("/login")
    public ResponseEntity<TransferableJWT> login(@RequestBody TransferableLoginForm request) throws Exception {
        auditor.info(" ---------- INICIO DE NUEVA REQUEST ----------");

        // TODO: El login no deberia generar otra token si la token vigente está disponible.

        try{
            UsernamePasswordAuthenticationToken usernamePasswordAuthenticationToken =
                    new UsernamePasswordAuthenticationToken(request.getName(), request.getPassword());

            authenticationManager.authenticate(usernamePasswordAuthenticationToken);
            auditor.info("AuthenticationManager: " + usernamePasswordAuthenticationToken);

            auditor.info(" ---------- GENERO EL TOKEN ----------");
            String token = jwtUtil.generarToken(request.getName());

            auditor.info(" ------------ TOKEN GENERADA: {}", token);
            auditor.info(" ---------- DEVUELVO EL TOKEN ----------");
            return ResponseEntity.ok(new TransferableJWT(token));
        }
        catch (Exception e){
            auditor.info(" ---------- FALLO EL LOGIN ----------");
            e.printStackTrace();
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Login failed, cause: " + e.getClass().getName(), new BadCredentialsException("Incorrect Password or Username")
            );
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody TransferableRegisterForm request) {
        authService.registrar(request);
        return ResponseEntity.ok("Usuario registrado");
    }
}
