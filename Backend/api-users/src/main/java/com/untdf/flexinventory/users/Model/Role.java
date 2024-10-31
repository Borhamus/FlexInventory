package com.untdf.flexinventory.users.Model;

import jakarta.persistence.*;

import java.util.List;

@Entity
@Table(name = "role", schema = "api-users")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column
    private Integer id;

    @Column
    private String name;

    @ManyToMany
    @JoinTable(
            name = "privilege_role",
            schema = "api-users",
            joinColumns = @JoinColumn(name = "id_role"),
            inverseJoinColumns = @JoinColumn(name = "id_privilege")
    )
    private List<Privilege> privileges;

    @ManyToMany(mappedBy = "roleList")
    private List<User> users;

    /* getters and setters */

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

    public List<User> getUsers() {
        return users;
    }

    public void setUsers(List<User> users) {
        this.users = users;
    }

    public List<Privilege> getPrivileges() {
        return privileges;
    }

    public void setPrivileges(List<Privilege> privileges) {
        this.privileges = privileges;
    }
}
