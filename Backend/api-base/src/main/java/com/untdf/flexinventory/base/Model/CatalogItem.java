package com.untdf.flexinventory.base.Model;


import jakarta.persistence.*;

@Entity
@Table(name = "catalog_item", schema = "api-base")
public class CatalogItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn (name = "item_id")
    private Item item;

    @ManyToOne
    @JoinColumn (name = "catalog_id")
    private Catalog catalog;

    @Column (name = "order criterion")
    private Integer organisation;

    public Catalog getCatalog() {
        return catalog;
    }

    public void setCatalog(Catalog catalog) {
        this.catalog = catalog;
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

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
}
