package com.untdf.flexinventory.base.Access;

import com.untdf.flexinventory.base.Model.inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccessInventory extends JpaRepository<inventory, Integer> {

}
