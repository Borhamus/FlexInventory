package com.untdf.flexinventory.users.Access;

import com.untdf.flexinventory.users.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccessUser extends JpaRepository<User, Integer> {
}