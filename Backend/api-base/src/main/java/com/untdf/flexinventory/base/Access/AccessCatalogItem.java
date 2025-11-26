package com.untdf.flexinventory.base.Access;
import com.untdf.flexinventory.base.Model.CatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Repository
public interface AccessCatalogItem extends JpaRepository<CatalogItem,Integer> {

    @Modifying
    @Transactional
    @Query("DELETE FROM CatalogItem ci WHERE ci.catalog.id = :catalogId AND ci.item.id IN :itemIds")
    int deleteItemsFromCatalog(@Param("catalogId")Integer catalogId  , @Param("itemIds") List<Integer> itemIds);

}