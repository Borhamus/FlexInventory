package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;

/**
 * En este ejemplo podemos ver como se mapea una entidad ya existente y persistida
 * en la Base de Datos <code>postgreSQL</code>. La definición de esta (Llamada unidad de persistencia)
 * se puede ver en <code>application.properties</code>.
 * <p>
 * <p>
 * Los atributos de esta clase corresponden a las columnas de la tabla,
 * mientras que los getters y setters son la manera en la que el ORM puede acceder a los datos de las columnas.
 * <p>
 * Se debe especificar correctamente el nombre, esquema y unidad de persistencia (puede haber más de una) definida en la base de datos.
 *
 * @Author Milton Gómez.
 */

@Entity
@Table(name = "inventory", schema = "api-base")
public class inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;


    /* ------------------- Getters y Setters -------------------*/
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
