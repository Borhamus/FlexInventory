package com.untdf.flexinventory.base.Access;

import com.untdf.flexinventory.base.Model.inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * En este ejemplo podemos ver como la interfaz del Modelo está vacia!!!
 * <p>
 * Esto es así ya que al extender de JpaRepository obtenemos toda la funcionalidad básica del manejo de entidades.
 * @Author Milton Gómez.
 */

@Repository
public interface AccessInventory extends JpaRepository<inventory, Integer> {

}
