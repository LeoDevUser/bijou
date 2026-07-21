package com.bijou.backend.config;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

import javax.sql.DataSource;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * One-time migration for the single-category → multi-category switch. Items used
 * to hold their category in an {@code items.category_id} column; they now hold it
 * in the {@code item_categories} join table. Under {@code ddl-auto=update} Hibernate
 * creates the join table but leaves the old column (with its data) in place, so we
 * backfill the join table from it. Idempotent and a no-op on fresh databases where
 * the legacy column was never created.
 */
@Component
@Order(4)
@RequiredArgsConstructor
@Slf4j
public class ItemCategoryBackfill implements ApplicationRunner {

    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            if (!legacyColumnExists(conn)) return;
            try (Statement st = conn.createStatement()) {
                int moved = st.executeUpdate(
                    "INSERT INTO item_categories (item_id, category_id) " +
                    "SELECT i.id, i.category_id FROM items i " +
                    "WHERE i.category_id IS NOT NULL " +
                    "AND NOT EXISTS (SELECT 1 FROM item_categories ic " +
                    "                WHERE ic.item_id = i.id AND ic.category_id = i.category_id)");
                if (moved > 0) {
                    log.info("backfilled {} item→category link(s) into item_categories", moved);
                }
            }
        } catch (Exception e) {
            // A backfill failure must never block startup — log and move on.
            log.warn("item category backfill skipped: {}", e.getMessage());
        }
    }

    /** True if the legacy {@code items.category_id} column still exists (case-insensitive). */
    private boolean legacyColumnExists(Connection conn) throws Exception {
        DatabaseMetaData meta = conn.getMetaData();
        for (String table : new String[] {"items", "ITEMS"}) {
            try (ResultSet cols = meta.getColumns(conn.getCatalog(), null, table, null)) {
                while (cols.next()) {
                    if ("category_id".equalsIgnoreCase(cols.getString("COLUMN_NAME"))) return true;
                }
            }
        }
        return false;
    }
}
