package com.untdf.flexinventory.base.Transferable;

public class TransferableAttributeValue {

    private TransferableAttribute attribute;
    private String value;


    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public TransferableAttribute getAttribute() {
        return attribute;
    }

    public void setAttribute(TransferableAttribute attribute) {
        this.attribute = attribute;
    }
}
