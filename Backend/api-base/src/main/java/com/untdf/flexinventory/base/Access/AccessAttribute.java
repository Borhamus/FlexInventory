package com.untdf.flexinventory.base.Access;

import com.untdf.flexinventory.base.Model.Attribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccessAttribute extends JpaRepository <Attribute, Integer> {

}
