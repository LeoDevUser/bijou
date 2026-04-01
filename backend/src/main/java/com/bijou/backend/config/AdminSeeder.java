package com.bijou.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.Role;
import com.bijou.backend.entities.Language;
import com.bijou.backend.repositories.ClientRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AdminSeeder implements ApplicationRunner {

    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${ADMIN_EMAIL}")
    private String ADMIN_EMAIL;

    @Value("${ADMIN_PASSWORD}")
    private String ADMIN_PASSWORD;

    @Override
    public void run(ApplicationArguments args) {
        if (clientRepository.findByEmail(ADMIN_EMAIL).isPresent()) {
            return;
        }
        Client admin = Client.builder()
            .email(ADMIN_EMAIL)
            .password(passwordEncoder.encode(ADMIN_PASSWORD))
            .firstName("ADMIN")
            .lastName("ADMIN")
            .address("N/A")
            .postalCode("N/A")
            .city("N/A")
            .country(Country.MEXICO)
            .role(Role.ADMIN)
            .language(Language.ES)
            .build();

        clientRepository.save(admin);
    }
}
