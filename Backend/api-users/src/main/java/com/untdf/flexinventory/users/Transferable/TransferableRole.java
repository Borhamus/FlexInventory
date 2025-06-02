package com.untdf.flexinventory.users.Transferable;

import com.untdf.flexinventory.users.Model.Privilege;
import com.untdf.flexinventory.users.Model.User;

import java.util.List;

public class TransferableRole {

    private Integer id;
    private String name;
    private List<TransferablePrivilege> privileges;

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

    public List<TransferablePrivilege> getPrivileges() {
        return privileges;
    }

    public void setPrivileges(List<TransferablePrivilege> privileges) {
        this.privileges = privileges;
    }
}
