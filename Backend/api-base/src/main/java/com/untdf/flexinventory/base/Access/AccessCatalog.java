package com.untdf.flexinventory.base.Access;

import com.untdf.flexinventory.base.Model.Catalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccessCatalog extends JpaRepository<Catalog,Integer> {}
