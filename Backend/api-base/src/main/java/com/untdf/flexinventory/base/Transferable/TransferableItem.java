package com.untdf.flexinventory.base.Transferable;

import com.untdf.flexinventory.base.Model.CatalogItem;
import com.untdf.flexinventory.base.Model.Inventory;
import com.untdf.flexinventory.base.Model.ItemAttributeValue;

import java.util.Date;
import java.util.List;

public class TransferableItem
{
    private Integer id;
    private String name;
    private Date creation_date;
    private TransferableInventory inventory;
    private List<TransferableAttributeValue> itemsAttributeValues;
    private List<TransferableCatalog> catalogs;

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

    public List<TransferableCatalog> getCatalogs() {
        return catalogs;
    }

    public void setCatalogs(List<TransferableCatalog> catalogs) {
        this.catalogs = catalogs;
    }

    public TransferableInventory getInventory() {
        return inventory;
    }

    public void setInventory(TransferableInventory inventory) {
        this.inventory = inventory;
    }

    public List<TransferableAttributeValue> getItemsAttributeValues() {
        return itemsAttributeValues;
    }

    public void setItemsAttributeValues(List<TransferableAttributeValue> itemsAttributeValues) {
        this.itemsAttributeValues = itemsAttributeValues;
    }
}


