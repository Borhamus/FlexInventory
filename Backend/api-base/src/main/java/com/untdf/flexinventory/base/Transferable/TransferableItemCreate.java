package com.untdf.flexinventory.base.Transferable;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class TransferableItemCreate
{
    private String name;
    private Integer inventory;
    private Map<Integer, String> itemAtributeValue;

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

    public Map<Integer, String> getItemAtributeValue() {
        return itemAtributeValue;
    }

    public void setItemAtributeValue(Map<Integer, String> itemAtributeValue) {
        this.itemAtributeValue = itemAtributeValue;
    }
}
