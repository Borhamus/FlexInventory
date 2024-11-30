package com.untdf.flexinventory.base.Transferable;

import java.util.Date;
import java.util.List;

public class TransferableItemInventory {

    private Integer id;
    private String name;
    private Date creation_date ;
    private List<TransferableAttributeValue> itemsAttributeValues;

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

    public List<TransferableAttributeValue> getItems_attribute_values() {
        return itemsAttributeValues;
    }

    public void setItems_attribute_values(List<TransferableAttributeValue> items_attribute_values) {
        this.itemsAttributeValues = items_attribute_values;
    }
}
