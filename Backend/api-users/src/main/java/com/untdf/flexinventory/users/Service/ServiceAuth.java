package com.untdf.flexinventory.users.Service;

import com.untdf.flexinventory.users.Access.AccessUser;
import com.untdf.flexinventory.users.Model.User;
import com.untdf.flexinventory.users.Transferable.TransferableLoginForm;
import com.untdf.flexinventory.users.Transferable.TransferableRegisterForm;
import com.untdf.flexinventory.users.Transferable.TransferableUser;
import com.untdf.flexinventory.users.Transformer.TransformerUser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class ServiceAuth {

    @Autowired
    private TransformerUser transformerUser;

    @Autowired
    private AccessUser accessUser;

    @Autowired
    private PasswordEncoder passwordEncoder;


    // Registra el usuario en la base de datos, encripta su contraseña
    public TransferableUser registrar(TransferableRegisterForm registerForm) {
        User user = new User();
        user.setName(registerForm.getUsername());
        user.setPassword(passwordEncoder.encode(registerForm.getPassword()));
        user.setEmail(registerForm.getEmail());
        user.setState(true);
        user.setCreation_date(new Date());
        return transformerUser.toDTO(accessUser.save(user));
    }

    // Valida las credenciales del usuario.
    public boolean validarCredenciales(TransferableLoginForm loginForm) {
        return accessUser.findByName(loginForm.getName())// Obtengo el usuario a través de su nombre (unico)
                .map(u -> passwordEncoder.matches(loginForm.getPassword(), u.getPassword())) // Retorno True si la contraseña coincide.
                .orElse(false);
    }
}
