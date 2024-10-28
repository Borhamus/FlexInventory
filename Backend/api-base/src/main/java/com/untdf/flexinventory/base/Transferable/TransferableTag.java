package com.untdf.flexinventory.base.Transferable;
import jakarta.persistence.*;

public class TransferableTag {
    private Integer id;
    private String name;
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
        this.color = color;
    }

}