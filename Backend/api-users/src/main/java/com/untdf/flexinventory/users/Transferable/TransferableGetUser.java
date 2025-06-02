package com.untdf.flexinventory.users.Transferable;

import com.untdf.flexinventory.users.Model.Role;

import java.util.List;

public class TransferableGetUser {

    private Integer id;
    private String name;
    private String email;
    private Boolean state;
    private List<TransferableRole> roleList;


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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Boolean getState() {
        return state;
    }

    public void setState(Boolean state) {
        this.state = state;
    }

    public List<TransferableRole> getRoleList() {
        return roleList;
    }

    public void setRoleList(List<TransferableRole> roleList) {
        this.roleList = roleList;
    }
}


