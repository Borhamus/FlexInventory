package com.untdf.flexinventory.users.Resource;

import com.untdf.flexinventory.users.Security.Jwt.JwtUtil;
import com.untdf.flexinventory.users.Service.ServiceAuth;
import com.untdf.flexinventory.users.Transferable.TransferableJWT;
import com.untdf.flexinventory.users.Transferable.TransferableLoginForm;
import com.untdf.flexinventory.users.Transferable.TransferableRegisterForm;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin("*")
@Tag(name = "Authentication Endpoint.", description = "Operations related to authentication, Login, Register, obtainToken, etc.")
public class ResourceAuth {
    @Autowired
    private ServiceAuth authService;

    @Autowired
    private JwtUtil jwtUtil;

    Logger auditor = LoggerFactory.getLogger(ResourceAuth.class);

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody TransferableLoginForm request) {
        auditor.info(" ---------- INICIO DE NUEVA REQUEST ----------");
        if (authService.validarCredenciales(request)){

            auditor.info(" ---------- LAS CREDENCIALES SON VALIDAS ----------");

            auditor.info(" ---------- GENERO EL TOKEN ----------");
            String token = jwtUtil.generarToken(request.getEmail());

            auditor.info(" ---------- DEVUELVO EL TOKEN ----------");
            return ResponseEntity.ok(new TransferableJWT(token, request.getEmail()));
        }

        auditor.info(" ---------- LAS CREDENCIAS SON INVALIDAS ----------");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody TransferableRegisterForm request) {
        authService.registrar(request);
        return ResponseEntity.ok("Usuario registrado");
    }

    @GetMapping(value = "/test")
    public String testeo(){
        return "TESTEO";
    }
}
