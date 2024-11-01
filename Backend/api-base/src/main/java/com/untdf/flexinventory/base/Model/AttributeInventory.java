package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;

@Entity
@Table(name = "attribute_inventory", schema = "api-base")
public class AttributeInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "inventory_id")
    Inventory inventory;

    @ManyToOne
    @JoinColumn(name = "attribute_id")
    Attribute attribute;

}
