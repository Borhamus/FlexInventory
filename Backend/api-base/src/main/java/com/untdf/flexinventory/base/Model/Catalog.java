package com.untdf.flexinventory.base.Model;


import jakarta.persistence.*;

import java.util.Date;
import java.util.List;

@Entity
@Table(name = "catalog", schema = "api-base")
public class Catalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column
    private String name;

    @Column
    private String description;

    @Column
    private Date revision_date;

    @Column
    private Date creation_date;

    @OneToMany(mappedBy = "catalog", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CatalogItem> items;

    /* ------------------- Getters y Setters -------------------*/
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Date getRevision_date() {return revision_date;}

    public void setRevision_date(Date revision_date) {this.revision_date = revision_date;}

    public Date getCreation_date() {return creation_date;}

    public void setCreation_date(Date creation_date) {this.creation_date = creation_date;}



    public List<CatalogItem> getItems() {
        return items;
    }

    public void setItems(List<CatalogItem> items) {
        this.items = items;
    }

    /* ------------------- CRUD -------------------*/


}