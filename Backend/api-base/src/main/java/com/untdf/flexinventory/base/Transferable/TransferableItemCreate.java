package com.untdf.flexinventory.base.Transferable;

import java.util.List;

public class TransferableItemCreate
{
    private String name;
    private List<Integer> attributes;
    private Integer inventory;
    private List<Integer> catalogs;

    //<--- Setter y getters--->

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Integer> getAttributes() {
        return attributes;
    }

    public void setAttributes(List<Integer> attributes) {
        this.attributes = attributes;
    }

    public Integer getInventory() {
        return inventory;
    }

    public void setInventory(Integer inventory) {
        this.inventory = inventory;
    }

    public List<Integer> getCatalogs() {
        return catalogs;
    }

    public void setCatalogs(List<Integer> catalogs) {
        this.catalogs = catalogs;
    }
}
