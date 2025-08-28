package com.untdf.flexinventory.base.Transferable;

import com.untdf.flexinventory.base.Model.Catalog;
import com.untdf.flexinventory.base.Model.Item;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import java.util.Date;
import java.util.List;

public class TransferableCatalogItem
{
    private Integer id;

    private TransferableItemCatalog item;

    private Integer organisation;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getOrganisation() {
        return organisation;
    }

    public void setOrganisation(Integer organisation) {
        this.organisation = organisation;
    }

    public TransferableItemCatalog getItem() {
        return item;
    }

    public void setItem(TransferableItemCatalog item) {
        this.item = item;
    }
}


