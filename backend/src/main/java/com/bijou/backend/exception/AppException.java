package com.bijou.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class AppException extends ResponseStatusException {
    private final String code;
    private final String detail;

    public AppException(HttpStatus status, String code, String detail) {
        super(status, code);
        this.code = code;
        this.detail = detail;
    }

    public AppException(HttpStatus status, String code) {
        this(status, code, null);
    }

    public String getCode() { return code; }
    public String getDetail() { return detail; }
}
