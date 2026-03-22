package com.bijou.backend.services;

public enum Currency {
    MXN,
    CAD,
    USD;

    @Override
    public String toString() {
        return name().toLowerCase();
    }
}
