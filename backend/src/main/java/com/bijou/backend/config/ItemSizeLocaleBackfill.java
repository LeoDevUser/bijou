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
 * One-time migration for the single-label → per-language switch on sizes. A size used
 * to carry one {@code item_sizes.size} string; it now carries {@code size_en},
 * {@code size_fr} and {@code size_es}. Under {@code ddl-auto=update} Hibernate adds the
 * three new columns but leaves the old one (with its data) in place, so we copy the
 * legacy label into all three and then drop it — its NOT NULL constraint would otherwise
 * reject every new size insert, exactly as {@link ItemCategoryBackfill} describes.
 *
 * <p>The old label is copied into all three languages rather than guessed at: a size
 * reads "60 cm" or "Chica" with no marker of which language it was written in, and a
 * populated field in every language is the one outcome that cannot render blank. Labels
 * that do need translating can then be edited per language in the admin panel.
 *
 * <p>Idempotent, and a no-op on fresh databases where the legacy column never existed.
 */
@Component
@Order(5)
@RequiredArgsConstructor
@Slf4j
public class ItemSizeLocaleBackfill implements ApplicationRunner {

    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            if (!legacyColumnExists(conn)) return;
            // Copy and drop in one transaction: Postgres DDL is transactional, so we never
            // end up having dropped the column without the labels safely moved over.
            boolean autoCommit = conn.getAutoCommit();
            conn.setAutoCommit(false);
            try (Statement st = conn.createStatement()) {
                int moved = st.executeUpdate(
                    "UPDATE item_sizes SET " +
                    "  size_en = COALESCE(NULLIF(size_en, ''), size), " +
                    "  size_fr = COALESCE(NULLIF(size_fr, ''), size), " +
                    "  size_es = COALESCE(NULLIF(size_es, ''), size) " +
                    "WHERE size IS NOT NULL AND size <> ''");
                st.executeUpdate("ALTER TABLE item_sizes DROP COLUMN size");
                conn.commit();
                log.info("copied {} size label(s) into en/fr/es and dropped legacy item_sizes.size", moved);
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(autoCommit);
            }
        } catch (Exception e) {
            // A backfill failure must never block startup — log and move on.
            log.warn("item size locale backfill skipped: {}", e.getMessage());
        }
    }

    /** True if the legacy {@code item_sizes.size} column still exists (case-insensitive). */
    private boolean legacyColumnExists(Connection conn) throws Exception {
        DatabaseMetaData meta = conn.getMetaData();
        for (String table : new String[] {"item_sizes", "ITEM_SIZES"}) {
            try (ResultSet cols = meta.getColumns(conn.getCatalog(), null, table, null)) {
                while (cols.next()) {
                    if ("size".equalsIgnoreCase(cols.getString("COLUMN_NAME"))) return true;
                }
            }
        }
        return false;
    }
}
