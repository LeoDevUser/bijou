package com.bijou.backend.auth;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
public class AuthService {
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

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
        //TODO
        return !addy.isBlank();
    }

    public AuthResponse register(RegisterRequest req) {
        log.info("registration attempt for email {}", req.email());
        String email = req.email();
        String pswd = req.password();
        Optional<String> res = Optional.empty();
        try {
            if (clientRepository.findByEmail(email).isPresent()) {
                log.warn("email {} already registered", req.email());
                throw new ResponseStatusException(HttpStatus.CONFLICT, "email already in use");
            }
            if (!isValidPassword(pswd)) {
                log.warn("invalid password, need a password between 8 and 30 characters with one uppercase, one lowercase, one digit, one special character");
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid password");
            }
            if (!validAddress(req.address())) {
                log.warn("invalid address", req.email());
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid address");
            }
        } catch (RuntimeException e) {
            log.warn("failed registration for email: {}", req.email());
            return new AuthResponse(res);
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

        String token = jwtService.generateToken(client);
        res = Optional.of(token);
        return new AuthResponse(res);
    }

    public AuthResponse login(LoginRequest req) {
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.email(), req.password()));
            log.info("login successful for email: {}", req.email());
        } catch (BadCredentialsException e) {
            log.warn("login unsuccessful for email: {}", req.email());
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }
        Client client = (Client)auth.getPrincipal();
        //auth succeeded
        String token = jwtService.generateToken(client);
        return new AuthResponse(Optional.of(token));
    }
}
