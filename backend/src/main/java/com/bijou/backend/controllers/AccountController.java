package com.bijou.backend.controllers;

import java.util.List;

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
import com.bijou.backend.services.AddressRequest;
import com.bijou.backend.services.ChangeEmailRequest;
import com.bijou.backend.services.PromoteRequest;
import com.bijou.backend.services.ClientProfileResponse;
import com.bijou.backend.services.ClientService;
import com.bijou.backend.services.ShortClientProfileResponse;
import com.bijou.backend.services.VerboseClientProfileResponse;

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
    public ResponseEntity<Void> changeAddress(@AuthenticationPrincipal Client client, @RequestBody AddressRequest req) {
        clientService.updateAddress(client, req);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/language")
    public ResponseEntity<Void> changeLanguage(@AuthenticationPrincipal Client client, @RequestParam String newLanguage) {
        clientService.updateLanguage(client, newLanguage);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/phone")
    public ResponseEntity<Void> changePhone(@AuthenticationPrincipal Client client, @RequestParam String phoneNumber) {
        clientService.updatePhone(client, phoneNumber);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/${ADMIN_PAGE}/promote")
    public ResponseEntity<Void> promote(@AuthenticationPrincipal Client admin, @Valid @RequestBody PromoteRequest req) {
        clientService.promote(admin, req);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/${ADMIN_PAGE}/profile/{id}")
    public ResponseEntity<VerboseClientProfileResponse> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(clientService.getVerboseProfile(id));
    } 

    @GetMapping("/${ADMIN_PAGE}/clients")
    public ResponseEntity<List<ShortClientProfileResponse>> getClients() {
        return ResponseEntity.ok(clientService.getClients());
    } 

    @GetMapping("/${ADMIN_PAGE}/admins")
    public ResponseEntity<List<VerboseClientProfileResponse>> getAdmins() {
        return ResponseEntity.ok(clientService.getAdmins());
    } 

    @GetMapping("/${ADMIN_PAGE}/clients/verbose")
    public ResponseEntity<List<VerboseClientProfileResponse>> getClientsVerbose() {
        return ResponseEntity.ok(clientService.getClientsVerbose());
    } 
}
