package com.bijou.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Role;

import io.jsonwebtoken.ExpiredJwtException;

public class JwtServiceTest {
    private static JwtService service = new JwtService();
    private static Client client;
    private static String secretKey = "gljLrE/0n+/CcfebmGelvksvcnG5aC1pHkeYTBYUxZI=";


    @BeforeAll
    public static void init(){
        ReflectionTestUtils.setField(service, "secretKey", secretKey);
        client = Client.builder()
            .address("123 BigStreet, Smallville, Persia")
            .email("word@mail.com")
            .firstName("John")
            .lastName("pork")
            .password("dfwefwefweqfwe")
            .role(Role.CLIENT)
            .build();

    }

    @Test
    void shouldGenerateNonNullToken() {
        assertNotNull(service.generateToken(client));
    }

    @Test
    void shouldExtractEmailFromToken() {
        String token = service.generateToken(client);
        assertEquals("word@mail.com",service.extractEmail(token));
    }

    @Test
    void shouldExtractRoleFromToken() {
        String token = service.generateToken(client);
        assertEquals("ROLE_CLIENT",service.extractRole(token));
    }

    @Test
    void shouldReturnTrueForValidToken() {
        String token = service.generateToken(client);
        assertTrue(service.isTokenValid(token, client));
    }

    @Test
    void shouldReturnFalseForExpiredToken() {
        String token = service.generateToken(client, Date.from(LocalDateTime.now().minusDays(1).atZone(ZoneId.systemDefault()).toInstant()));
        assertThrows(ExpiredJwtException.class, () -> {service.isTokenValid(token,client);});
    }

    @Test
    void shouldReturnFalseWhenEmailMismatch() {
        Client client2 = Client.builder()
            .address("123 BigStreet, Smallville, Persia")
            .email("phrase@mail.com")
            .firstName("John")
            .lastName("pork")
            .password("dfwefwefweqfwe")
            .role(Role.CLIENT)
            .build();
        String token = service.generateToken(client);
        assertFalse(service.isTokenValid(token, client2));
    }
}
