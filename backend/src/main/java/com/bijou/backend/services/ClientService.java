package com.bijou.backend.services;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
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
        // Rely on the DB unique constraint rather than a pre-check to avoid TOCTOU.
        // Two concurrent change-email requests for the same new address cannot both succeed.
        client.setEmail(req.newEmail());
        try {
            clientRepository.save(client);
            log.info("email change successful");
        } catch (DataIntegrityViolationException e) {
            log.warn("email {} already registered", req.newEmail());
            throw new AppException(HttpStatus.CONFLICT, "EMAIL_CONFLICT");
        }
    }

    public ClientProfileResponse getProfile(Client client) {
        log.info("retrieved profile of {}", client.getEmail());
        return new ClientProfileResponse(
                client.getFirstName(),
                client.getLastName(),
                client.getEmail(),
                client.getAddressLine1(),
                client.getAddressLine2(),
                client.getColonial(),
                client.getCity(),
                client.getState(),
                client.getPostalCode(),
                client.getCountry().name(),
                client.getPhoneNumber(),
                client.getLanguage().name(),
                client.getRfc(),
                client.getRegimenFiscal() != null ? client.getRegimenFiscal().name() : null);
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
                client.getAddressLine1(),
                client.getAddressLine2(),
                client.getColonial(),
                client.getCity(),
                client.getState(),
                client.getPostalCode(),
                client.getCountry().name(),
                client.getPhoneNumber(),
                client.getLanguage().name(),
                client.getCreatedOn(),
                client.getRole(),
                client.getStripeCustomerId(),
                client.getNbSuccessfulOrders(),
                client.getMoneySpent(),
                client.getRfc(),
                client.getRegimenFiscal() != null ? client.getRegimenFiscal().name() : null
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
        Country country = Country.valueOf(req.country());
        if (country == Country.MEXICO && (req.colonial() == null || req.colonial().isBlank())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "COLONIAL_REQUIRED");
        }
        client.setAddressLine1(req.addressLine1());
        client.setAddressLine2(req.addressLine2());
        client.setColonial(req.colonial());
        client.setCity(req.city());
        client.setState(req.state());
        client.setPostalCode(req.postalCode());
        client.setCountry(country);
        client.setPhoneNumber(req.phoneNumber());
        clientRepository.save(client);
        log.info("updated address of {}", client.getEmail());
    }

    public void updateLanguage(Client client, String newLang) {
        client.setLanguage(Language.valueOf(newLang));
        clientRepository.save(client);
        log.info("updated Language of {}", client.getEmail());
    }

    // Used at checkout to capture a phone number that was left blank at sign-up.
    public void updatePhone(Client client, String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "PHONE_REQUIRED");
        }
        client.setPhoneNumber(phoneNumber);
        clientRepository.save(client);
        log.info("updated phone of {}", client.getEmail());
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
