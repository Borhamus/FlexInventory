package com.untdf.flexinventory.base.Transferable;

import com.untdf.flexinventory.base.Model.AttributeItem;
import com.untdf.flexinventory.base.Model.CatalogItem;
import com.untdf.flexinventory.base.Model.Inventory;
import jakarta.persistence.*;

import java.util.Date;
import java.util.List;

public class TransferableItem
{
    private Integer id;
    private String name;
    private Date creation_date ;
    private List<AttributeItem> attributeItems;
    private Inventory inventory;
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


