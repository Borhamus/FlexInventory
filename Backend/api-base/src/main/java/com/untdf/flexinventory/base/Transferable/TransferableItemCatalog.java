package com.untdf.flexinventory.base.Transferable;

import java.util.Date;
import java.util.List;

public class TransferableItemCatalog
{
    private Integer id;
    private String name;
    private Date creation_date;
    private List<TransferableAttributeValue> itemsAttributeValues;

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

    public List<TransferableAttributeValue> getItemsAttributeValues() {
        return itemsAttributeValues;
    }

    public void setItemsAttributeValues(List<TransferableAttributeValue> itemsAttributeValues) {
        this.itemsAttributeValues = itemsAttributeValues;
    }
}


