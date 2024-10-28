package com.untdf.flexinventory.base.Access;

import com.untdf.flexinventory.base.Model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccessTag extends JpaRepository<Tag,Integer> {}
