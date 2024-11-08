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

    @OneToMany(mappedBy = "item")
    private List<AttributeItem> attributeItems;

    @ManyToOne
    @JoinColumn(name = "inventory_id")
    private Inventory inventory;

    @OneToMany(mappedBy = "item")
    private List<CatalogItem> catalogs;

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

    public Inventory getInventory() {
        return inventory;
    }

    public void setInventory(Inventory inventory) {
        this.inventory = inventory;
    }

    public List<AttributeItem> getAttributeItems() {
        return attributeItems;
    }

    public void setAttributeItems(List<AttributeItem> attributeItems) {
        this.attributeItems = attributeItems;
    }

    public List<CatalogItem> getCatalogs() {
        return catalogs;
    }

    public void setCatalogs(List<CatalogItem> catalogs) {
        this.catalogs = catalogs;
    }
}