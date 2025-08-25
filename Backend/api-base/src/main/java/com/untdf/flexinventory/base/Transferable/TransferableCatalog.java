package com.untdf.flexinventory.base.Transferable;

import java.util.Date;
import java.util.List;

public class TransferableCatalog {
    private Integer id;
    private String name;
    private String description;
    private Date revision_date;
    private Date creation_date;
    private List<TransferableCatalogItem> items;

    /* ------------------- Getters y Setters -------------------*/
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {return this.name;}

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Date getRevision_date() {return revision_date;}

    public void setRevision_date(Date revision_date) {this.revision_date = revision_date;}

    public Date getCreation_date() {
        return creation_date;
    }

    public void setCreation_date(Date creation_date) {
        this.creation_date = creation_date;
    }

    public List<TransferableCatalogItem> getItems() {
        return items;
    }

    public void setItems(List<TransferableCatalogItem> items) {
        this.items = items;
    }
}