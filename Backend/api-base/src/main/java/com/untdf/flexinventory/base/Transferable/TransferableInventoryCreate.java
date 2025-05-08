package com.untdf.flexinventory.base.Transferable;

import java.sql.Date;
import java.util.List;
import java.util.Map;

public class TransferableInventoryCreate {

    private String name;
    private String description;
    private Date revision_date;

    // Esto va a ser ignorado a la hora de ser mapeado porque en la entidad
    // Inventory no existe un atributo llamado "attributesIds"
    private List<Integer> attributesIds;

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

    public List<Integer> getAttributesIds() {
        return attributesIds;
    }

    public void setAttributesIds(List<Integer> attributesIds) {
        this.attributesIds = attributesIds;
    }
}
