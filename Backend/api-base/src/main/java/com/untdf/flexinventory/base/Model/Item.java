package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;
import java.util.Date;
import java.util.List;

@Entity
@Table(name="item", schema="api-base")
public class Item{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column
    private String name;

    @Column
    private Date creation_date ;

    @Column
    private ForeignKey inventory_id;

    @ManyToMany
    @JoinTable (
            name = "attribute_item",
            schema = "api-base",
            joinColumns = @JoinColumn(
                    name = "attribute_id",
                    referencedColumnName = "attribute_id"
            ),
            inverseJoinColumns = @JoinColumn(
                    name = "attribute_inventory_id",
                    referencedColumnName = "attribute_inventory_id"

            )
    )

    @OneToMany(mappedBy = "item")
    private List<AttributeItem> attributeItems;



    // Setters & Getters

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

    public Date getCreation_date() {
        return creation_date;
    }

    public void setCreation_date(Date creation_date) {
        this.creation_date = creation_date;
    }

    public ForeignKey getInventory_id() {
        return inventory_id;
    }

    public void setInventory_id(ForeignKey inventory_id) {
        this.inventory_id = inventory_id;
    }
}