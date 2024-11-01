package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;

@Entity
@Table(name = "attribute_item", schema = "api-base")
public class AttributeItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn (name = "item_id")
    Item item;

    @ManyToOne
    @JoinColumn (name = "attribute_iventory_id")
    AttributeInventory attribute_inventory_id;

    @Column
    private String value;


    // Setters & Getters

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }
}
