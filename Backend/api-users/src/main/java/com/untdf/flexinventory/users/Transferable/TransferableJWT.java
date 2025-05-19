package com.untdf.flexinventory.users.Transferable;

public class TransferableJWT {
    private String token;

    public TransferableJWT() {
    }

    public TransferableJWT(String token) {
        this.token = token;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
