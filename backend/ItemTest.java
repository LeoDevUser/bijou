package com.bijou.backend.entities;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class ItemTest {

    private Item item;

    @BeforeEach
    void setUp() {
        item = Item.builder()
            .name("Gold Ring")
            .price(299.99)
            .stock(50)
            .category(Category.RING)
            .build();
    }

    @Test
    void builderSetsNameCorrectly() {
        assertEquals("Gold Ring", item.getName());
    }

    @Test
    void priceIsPositive() {
        assertTrue(item.getPrice() > 0);
    }

    @Test
    void skuIsNullBeforePersisting() {
        assertNull(item.getSku());
    }
}
