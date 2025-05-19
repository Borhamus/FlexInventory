package com.untdf.flexinventory.users.Access;

import com.untdf.flexinventory.users.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccessUser extends JpaRepository<User, Integer> {

    // Spring automaticamente implementa esta funcionalidad
    Optional<User> findByEmail(String email);

    Optional<User> findByName(String username);
}