package com.untdf.flexinventory.base.Access;


import com.untdf.flexinventory.base.Model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccessItem extends JpaRepository<Item, Integer> {}
