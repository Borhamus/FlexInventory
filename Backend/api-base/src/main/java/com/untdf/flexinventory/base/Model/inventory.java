package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;

import java.sql.Date;

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

    @Column
    private String name;

    @Column
    private String user;

    @Column
    private String description;

    @Column
    private Date revision_date;

    @Column
    private Date creation_date;


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

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Date getRevision_date() {
        return revision_date;
    }

    public void setRevision_date(Date revision_date) {
        this.revision_date = revision_date;
    }

    public Date getCreation_date() {
        return creation_date;
    }

    public void setCreation_date(Date creation_date) {
        this.creation_date = creation_date;
    }
}
