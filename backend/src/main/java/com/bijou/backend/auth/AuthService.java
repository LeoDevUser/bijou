package com.bijou.backend.auth;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Role;
import com.bijou.backend.repositories.ClientRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
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
        return true;
    }

    public AuthResponse register(RegisterRequest req) {
        String email = req.email();
        String pswd = req.password();
        Optional<String> res = Optional.empty();
        try {
            //TODO CHANGE LATER
            //to throw better excpetions
            //or maybe not even throw them since client
            //would know sine we return an empty response
            if (clientRepository.findByEmail(email).isPresent()) {
                throw new RuntimeException();
            }
            if (!isValidPassword(pswd)) {
                throw new RuntimeException();
            }
            if (!validAddress(req.address())) {
                throw new RuntimeException();
            }
        } catch (RuntimeException e) {
            e.printStackTrace();
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
        Optional<String> res = Optional.empty();
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(req.email(), req.password()));
        } catch (BadCredentialsException e) {
            e.printStackTrace();
            return new AuthResponse(res);
        }
        Client client = (Client)auth.getPrincipal();
        //auth succeeded
        String token = jwtService.generateToken(client);
        return new AuthResponse(Optional.of(token));
    }
}
