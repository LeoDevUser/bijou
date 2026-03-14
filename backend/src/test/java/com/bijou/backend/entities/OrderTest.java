package com.bijou.backend.entities;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class OrderTest {
    private static Client test_client;
    private Order order;

    @BeforeAll
    public static void init(){
        test_client = Client.builder()
            .address("123 BigStreet, Smallville, Persia")
            .email("word@mail.com")
            .firstName("John")
            .lastName("pork")
            .password("dfwefwefweqfwe")
            .role(Role.CLIENT)
            .build();

    }

    @BeforeEach
    public void setUp(){
        order = Order.builder()
            .address(test_client.getAddress())
            .client(test_client)
            .totalPrice(new BigDecimal("324.0"))
            .build();
    }

    @Test
    void shouldHaveCorrectTotalPrice() {
        assertEquals(0, new BigDecimal("324.0").compareTo(order.getTotalPrice()));

    }

    @Test
    void shouldHaveCorrectClient() {
        assertEquals(test_client, order.getClient());
    }

    @Test
    void shouldHaveCorrectAddress() {
        assertEquals("123 BigStreet, Smallville, Persia", order.getAddress());
    }

    @Test
    void statusShouldBeNullBeforePersisting() {
        assertNull(order.getStatus());
    }

    @Test
    void createdAtShouldBeNullBeforePersisting() {
        assertNull(order.getCreatedAt());
    }

    @Test
    void idShouldBeNullBeforePersisting() {
        assertNull(order.getId());
    }

    @Test
    void trackingNumberShouldBeNullByDefault() {
        assertNull(order.getTrackingNumber());
    }
}
