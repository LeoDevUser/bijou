package com.bijou.backend.entities;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

public class ItemTest {
    private Item item;

    @BeforeEach
    public void setUp(){
        item = Item.builder()
            .name("Gold Ring")
            .price(new BigDecimal(200.00))
            .category(Category.RING)
            .stock(50)
            .labels(List.of("18k", "Gold"))
            .build();
    }

    @Test
    void builderSetsNameCorrectly() {
        assertEquals("Gold Ring", item.getName());
    }

    @Test
    void priceIsPositive() {
        assertTrue(item.getPrice().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    void skuIsNullBeforePersisting() {
        assertNull(item.getId());
    }


}
