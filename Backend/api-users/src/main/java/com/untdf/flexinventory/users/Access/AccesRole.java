package com.untdf.flexinventory.users.Access;

import com.untdf.flexinventory.users.Model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccesRole extends JpaRepository<Role, Integer> {
}
