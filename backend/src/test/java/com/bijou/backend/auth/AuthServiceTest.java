package com.bijou.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Role;
import com.bijou.backend.repositories.ClientRepository;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {
    @Mock
    private ClientRepository clientRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtService jwtService;
    private static Client client;
    @InjectMocks
    private AuthService authService;

    @BeforeAll
    public static void init(){
        client = Client.builder()
            .address("123 BigStreet, Smallville, Persia")
            .email("word@mail.com")
            .firstName("John")
            .lastName("pork")
            .password("dfwefwefweqfweA$2")
            .role(Role.CLIENT)
            .build();
    }

    @Test
    void shouldRegisterClientAndReturnToken() {
        RegisterRequest req = new RegisterRequest("joe@mail.com", "ddfsdfsdadaA$3", "joe", "dragonball", "567 mean street alabama, US");
        when(clientRepository.save(any(Client.class))).thenReturn(new Client());
        when(jwtService.generateToken(any())).thenReturn("fake-token");
        assertEquals("fake-token", authService.register(req));
        verify(clientRepository).save(any(Client.class));
    }

    @Test
    void shouldThrowConflictWhenEmailAlreadyExists() {
        when(clientRepository.findByEmail("joe@mail.com")).thenReturn(Optional.of(client));
        RegisterRequest req = new RegisterRequest("joe@mail.com", "password", "joe", "dragonball", "567 mean street alabama, US");
        assertThrows(ResponseStatusException.class, () -> {authService.register(req);});
    }

    /*
    //TODO
    @Test
    void shouldThrowBadRequestWhenPasswordTooShort() {}

    @Test
    void shouldThrowBadRequestWhenPasswordHasNoSpecialChar() {}

    @Test
    void shouldThrowBadRequestWhenPasswordHasNoUppercase() {}

    @Test
    void shouldThrowBadRequestWhenPasswordHasNoDigit() {}

    @Test
    void shouldThrowBadRequestWhenAddressIsBlank() {}

    @Test
    void shouldLoginAndReturnToken() {}

    @Test
    void shouldThrowUnauthorizedWhenBadCredentials() {}
    */
}
