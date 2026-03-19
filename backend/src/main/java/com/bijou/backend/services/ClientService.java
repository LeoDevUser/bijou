package com.bijou.backend.services;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Role;
import com.bijou.backend.repositories.ClientRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClientService {
    private final PasswordEncoder passwordEncoder;
    private final ClientRepository clientRepository;
    
    public void changeEmail(Client client, ChangeEmailRequest req) {
        log.info("email change attempt for email {}", client.getEmail());
        if (!passwordEncoder.matches(req.password(), client.getPassword())) {
            log.warn("wrong password");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
        if (clientRepository.findByEmail(req.newEmail()).isPresent()) {
            log.warn("email {} already registered", client.getEmail());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already linked to another account");
        }
        client.setEmail(req.newEmail());
        clientRepository.save(client);
    }

    public ClientProfileResponse getProfile(Client client) {
        log.info("retrieved profile of {}", client.getEmail());
        return new ClientProfileResponse(
                client.getFirstName(),
                client.getLastName(),
                client.getEmail(),
                client.getAddress());
    }

    public void updateAddress(Client client, String newAddress) {
        client.setAddress(newAddress);
        clientRepository.save(client);
        log.info("updated address of {}", client.getEmail());
    }

    public void promote(Long id) {
        Client client = clientRepository.findById(id).orElseThrow(() -> {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "client id not found for promotion");
        });
        client.setRole(Role.ADMIN);
    }
}
