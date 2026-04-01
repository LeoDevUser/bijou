package com.bijou.backend.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.Language;
import com.bijou.backend.exception.AppException;
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
            throw new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }
        if (clientRepository.findByEmail(req.newEmail()).isPresent()) {
            log.warn("email {} already registered", client.getEmail());
            throw new AppException(HttpStatus.CONFLICT, "EMAIL_CONFLICT");
        }
        log.info("email change successful");
        client.setEmail(req.newEmail());
        clientRepository.save(client);
    }

    public ClientProfileResponse getProfile(Client client) {
        log.info("retrieved profile of {}", client.getEmail());
        return new ClientProfileResponse(
                client.getFirstName(),
                client.getLastName(),
                client.getEmail(),
                client.getAddress(),
                client.getPostalCode(),
                client.getCity(),
                client.getCountry().name(),
                client.getLanguage().name());
    }

    public VerboseClientProfileResponse getVerboseProfile(Long id) {
        Client client = clientRepository.findById(id).orElseThrow(() -> {
            return new AppException(HttpStatus.NOT_FOUND, "CLIENT_NOT_FOUND");
        });
        log.info("retrieved profile of {}", client.getEmail());
        return toVerbose(client);
    }

    private VerboseClientProfileResponse toVerbose(Client client) {
        return new VerboseClientProfileResponse(
                client.getId(),
                client.getFirstName(),
                client.getLastName(),
                client.getEmail(),
                client.getAddress(),
                client.getPostalCode(),
                client.getCity(),
                client.getCountry().name(),
                client.getLanguage().name(),
                client.getCreatedOn(),
                client.getRole(),
                client.getStripeCustomerId(),
                client.getNbSuccessfulOrders(),
                client.getMoneySpent()
            );
    }

    private ShortClientProfileResponse toShortProfile(Client client) {
        return new ShortClientProfileResponse(client.getFirstName(), client.getLastName(), client.getId(), client.getEmail());
    }

    public List<ShortClientProfileResponse> getClients() {
        return clientRepository.findAllByRole(Role.CLIENT).stream()
            .map(client -> toShortProfile(client))
            .toList();
    }

    public List<VerboseClientProfileResponse> getClientsVerbose() {
        return clientRepository.findAllByRole(Role.CLIENT).stream()
            .map(client -> toVerbose(client))
            .toList();
    }

    public List<VerboseClientProfileResponse> getAdmins() {
        return clientRepository.findAllByRole(Role.ADMIN).stream()
            .map(admin -> toVerbose(admin))
            .toList();
    }

    public void updateAddress(Client client, AddressRequest req) {
        client.setAddress(req.address());
        client.setPostalCode(req.postalCode());
        client.setCity(req.city());
        client.setCountry(Country.valueOf(req.country()));
        clientRepository.save(client);
        log.info("updated address of {}", client.getEmail());
    }

    public void updateLanguage(Client client, String newLang) {
        client.setLanguage(Language.valueOf(newLang));
        clientRepository.save(client);
        log.info("updated Language of {}", client.getEmail());
    }

    public void promote(Client admin, PromoteRequest req) {
        if (!passwordEncoder.matches(req.adminPassword(), admin.getPassword())) {
            log.warn("wrong password");
            throw new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }
        Client client = clientRepository.findById(req.id()).orElseThrow(() -> {
            return new AppException(HttpStatus.NOT_FOUND, "CLIENT_NOT_FOUND");
        });
        client.setRole(Role.ADMIN);
        clientRepository.save(client);
        log.info("promoted {} to admin by admin {}", client.getEmail(), admin.getEmail());
    }
}
