package com.bijou.backend.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bijou.backend.auth.AuthService;
import com.bijou.backend.auth.ChangePasswordRequest;
import com.bijou.backend.entities.Client;
import com.bijou.backend.services.ChangeEmailRequest;
import com.bijou.backend.services.ClientProfileResponse;
import com.bijou.backend.services.ClientService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {
    private final AuthService authService;
    private final ClientService clientService;

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal Client client, @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(client, req);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/email")
    public ResponseEntity<Void> changeEmail(@AuthenticationPrincipal Client client, @Valid @RequestBody ChangeEmailRequest req) {
        clientService.changeEmail(client, req);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/profile")
    public ResponseEntity<ClientProfileResponse> getProfile(@AuthenticationPrincipal Client client) {
        return ResponseEntity.ok(clientService.getProfile(client));
    } 

    @PatchMapping("/address")
    public ResponseEntity<Void> changeAddress(@AuthenticationPrincipal Client client, @RequestParam String newAddress) {
        clientService.updateAddress(client, newAddress);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/${ADMIN_PAGE}/promote/{id}")
    public ResponseEntity<Void> promote(@PathVariable Long id) {
        clientService.promote(id);
        return ResponseEntity.ok().build();
    }
}
