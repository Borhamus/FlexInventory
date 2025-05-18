package com.untdf.flexinventory.users.Transferable;

public class TransferableJWT {
    private String token;
    private String type = "Bearer"; // fijo usamos Bearer
    private String email;

    // constructores
    public TransferableJWT() {}

    public TransferableJWT(String token, String username) {
        this.token = token;
        this.email = username;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public String getUsername() {
        return email;
    }

    public void setUsername(String username) {
        this.email = username;
    }
}
