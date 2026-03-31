package com.bijou.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Client;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.entities.Role;
import com.bijou.backend.repositories.ClientRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AuthService {
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
        ClientRepository clientRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService
    ) {
        this.clientRepository = clientRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    private boolean checkChars(String str) {
        //returns true if meets the char requirements
        boolean hasSpecial = false; boolean hasUpper = false; boolean hasLower = false; boolean hasDigit = false;
        for(char c: str.toCharArray()) {
            if ("!@#$%^&*()[]{}|~`".indexOf(c) >= 0) hasSpecial = true;
            else if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
        }
        return hasSpecial && hasUpper && hasLower && hasDigit;
    }

    private boolean isValidPassword(String pswd) {
        return pswd.length() >= 8 && pswd.length() <= 30 && checkChars(pswd);
    }

    private boolean validAddress(String addy) {
        //may change this later
        return !addy.isBlank();
    }

    public String register(RegisterRequest req) {
        log.info("registration attempt for email {}", req.email());
        String email = req.email();
        String pswd = req.password();
        if (clientRepository.findByEmail(email).isPresent()) {
            log.warn("email {} already registered", req.email());
            throw new AppException(HttpStatus.CONFLICT, "EMAIL_CONFLICT");
        }
        if (!isValidPassword(pswd)) {
            log.warn("invalid password, need a password between 8 and 30 characters with one uppercase, one lowercase, one digit, one special character");
            throw new AppException(HttpStatus.BAD_REQUEST, "PASSWORD_INVALID");
        }
        if (!validAddress(req.address())) {
            log.warn("invalid address");
            throw new AppException(HttpStatus.BAD_REQUEST, "ADDRESS_INVALID");
        }

        String encoded = passwordEncoder.encode(pswd);
        Client client = Client.builder()
            .address(req.address())
            .firstName(req.firstName())
            .email(email)
            .lastName(req.lastName())
            .password(encoded)
            .role(Role.CLIENT)
            .build();

        clientRepository.save(client);
        log.info("registration successful for email {}", email);
        String token = jwtService.generateToken(client);
        return token;
    }

    public String login(LoginRequest req) {
        Client client = clientRepository.findByEmail(req.email()).orElseThrow(() -> {
            log.warn("login failed for email {} — account not found", req.email());
            return new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        });

        if (!passwordEncoder.matches(req.password(), client.getPassword())){
            log.warn("login failed for email {} — wrong password", req.email());
            throw new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        if (client.getRole() == Role.ADMIN) {
            log.info("admin login successful for email {}", req.email());
        } else {
            log.info("login successful for email {}", req.email());
        }
        return jwtService.generateToken(client);
    }

    public void changePassword(Client client, ChangePasswordRequest req) {
        if (!isValidPassword(req.newPassword())) {
            log.warn("invalid password ...");
            throw new AppException(HttpStatus.BAD_REQUEST, "PASSWORD_INVALID");
        }

        if (!passwordEncoder.matches(req.oldPassword(), client.getPassword())) {
            log.warn("old password verification unsuccessful for email: {}", client.getEmail());
            throw new AppException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        log.info("old password verified for email: {}", client.getEmail());
        client.setPassword(passwordEncoder.encode(req.newPassword()));
        clientRepository.save(client);
    }
}
