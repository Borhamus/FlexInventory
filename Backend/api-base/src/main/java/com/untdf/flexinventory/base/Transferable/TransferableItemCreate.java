package com.untdf.flexinventory.base.Transferable;

import com.untdf.flexinventory.base.Model.AttributeItem;
import com.untdf.flexinventory.base.Model.Inventory;

import java.util.Date;
import java.util.List;

public class TransferableItemCreate
{
    private String name;
    private Date creation_date ;
    private List<AttributeItem> attributeItems;
    private Inventory inventory;


    //<--- Setter y getters--->

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

}
