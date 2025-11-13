package com.untdf.flexinventory.users.Model;

import jakarta.persistence.*;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "user", schema = "api-registro")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column
    private Integer id;

    @Column
    private String name;

    @Column
    private String password;

    @Column
    private String email;

    @Column
    private Boolean state;

    @Column
    private Date creation_date;

    // insertable = false ya que la bd genera el dato de forma automaitca
    @Column(insertable = false, updatable = false)
    private UUID tenant_uuid;

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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Boolean getState() {
        return state;
    }

    public void setState(Boolean state) {
        this.state = state;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Date getCreation_date() {
        return creation_date;
    }

    public void setCreation_date(Date creation_date) {
        this.creation_date = creation_date;
    }

    public UUID getTenant_uuid() {
        return tenant_uuid;
    }

    public void setTenant_uuid(UUID tenant_uuid) {
        this.tenant_uuid = tenant_uuid;
    }
}
