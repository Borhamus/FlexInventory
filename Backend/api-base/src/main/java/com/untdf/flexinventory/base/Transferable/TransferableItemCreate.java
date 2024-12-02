package com.untdf.flexinventory.base.Transferable;

import java.util.Date;
import java.util.List;

public class TransferableItemCreate
{
    private String name;
    private Integer inventory;
    private Date creation_date;
    private List<Integer> attributes;
    private List<Integer> catalogs;

    //<--- Setter y getters--->


    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getInventory() {
        return inventory;
    }

    public void setInventory(Integer inventory) {
        this.inventory = inventory;
    }

    public Date getCreation_date() {
        return creation_date;
    }

    public void setCreation_date(Date creation_date) {
        this.creation_date = creation_date;
    }

    public List<Integer> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<Integer> attributes) {
        this.attributes = attributes;
    }

    public List<Integer> getCatalogs() {
        return catalogs;
    }

    public void setCatalogs(List<Integer> catalogs) {
        this.catalogs = catalogs;
    }
}
