package com.untdf.flexinventory.base.Model;

import jakarta.persistence.*;

@Entity
@Table(name = "catalog_item", schema = "api-base")
public class Catalog_item {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column
    private Integer item_id;

    @Column
    private  Integer catalog_id;

    @Column
    private  Integer organisation;


}
