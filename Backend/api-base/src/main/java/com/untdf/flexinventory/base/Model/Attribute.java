package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "Attribute", schema = "api-base")
public class Attribute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column
    private String type;

    @Column
    private String name;

    @OneToMany(mappedBy = "attribute")
    private List<AttributeInventory> inventoryAtributes;

    /* getters and setters */

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
