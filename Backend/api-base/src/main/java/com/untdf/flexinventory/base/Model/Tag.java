package com.untdf.flexinventory.base.Model;


import jakarta.persistence.*;

@Entity
@Table(name = "tag", schema = "api-base")
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column
    private String name;

    @Column
    private String color;


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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.name = color;
    }

}