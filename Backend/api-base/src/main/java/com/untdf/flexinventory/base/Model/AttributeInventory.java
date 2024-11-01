package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "attribute_inventory", schema = "api-base")
public class AttributeInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "inventory_id")
    private Inventory inventory;

    @ManyToOne
    @JoinColumn(name = "attribute_id")
    private Attribute attribute;

    @OneToMany(mappedBy = "attribute_inventory_id")
    private List<AttributeItem> attributeItems;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Inventory getInventory() {
        return inventory;
    }

    public void setInventory(Inventory inventory) {
        this.inventory = inventory;
    }

    public Attribute getAttribute() {
        return attribute;
    }

    public void setAttribute(Attribute attribute) {
        this.attribute = attribute;
    }

    public List<AttributeItem> getAttributeItems() {
        return attributeItems;
    }

    public void setAttributeItems(List<AttributeItem> attributeItems) {
        this.attributeItems = attributeItems;
    }
}
