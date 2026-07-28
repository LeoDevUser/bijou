package com.bijou.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorResponse> handle(AppException e) {
        return ResponseEntity.status(e.getStatusCode())
            .body(new ErrorResponse(e.getCode(), e.getDetail()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handle(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode())
            .body(new ErrorResponse(e.getReason(), null));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handle(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("INVALID_REQUEST_BODY", e.getMessage()));
    }

    /** Body past spring.servlet.multipart.* — the per-type caps normally catch this first. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handle(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
            .body(new ErrorResponse("FILE_TOO_LARGE", e.getMessage()));
    }
}
