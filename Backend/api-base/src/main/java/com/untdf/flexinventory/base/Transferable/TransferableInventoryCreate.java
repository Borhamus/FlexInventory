package com.untdf.flexinventory.base.Transferable;

import java.sql.Date;

public class TransferableInventoryCreate {

    private String name;
    private String description;
    private Date revision_date;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Date getRevision_date() {
        return revision_date;
    }

    public void setRevision_date(Date revision_date) {
        this.revision_date = revision_date;
    }
}
