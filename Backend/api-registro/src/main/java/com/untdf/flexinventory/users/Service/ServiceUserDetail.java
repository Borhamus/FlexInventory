package com.untdf.flexinventory.users.Service;

import com.untdf.flexinventory.users.Access.AccessUser;
import com.untdf.flexinventory.users.Model.User;
import com.untdf.flexinventory.users.Resource.ResourceAuth;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ServiceUserDetail implements UserDetailsService {
    @Autowired
    private AccessUser usuarioRepository;

    Logger auditor = LoggerFactory.getLogger(ResourceAuth.class);

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        auditor.info("----------- LoadUserByUsername -----------");
        User usuario = usuarioRepository.findByName(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con username: " + username));

        auditor.info("UserName: {} ", usuario.getName());

        // Convertir roles a authorities -> Proximamente.
        List<GrantedAuthority> authorities = new ArrayList<>();
        auditor.info("Authorities: {} ", authorities);

        auditor.info("----------- END -----------");
        return new org.springframework.security.core.userdetails.User(usuario.getEmail(),usuario.getPassword(),authorities);
    }
}
