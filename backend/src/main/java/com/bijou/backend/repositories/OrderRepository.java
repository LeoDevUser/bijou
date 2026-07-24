package com.bijou.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.Order;
import com.bijou.backend.entities.Status;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByClient_Email(String email);
    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<Order> findByClient(Client client);
    List<Order> findByClientAndCreatedAtBetween(Client client,LocalDateTime start, LocalDateTime end);
    List<Order> findByClient_EmailAndCreatedAtBetween(String email, LocalDateTime start, LocalDateTime end);
    List<Order> findByStatus(Status status);
    List<Order> findByStatusAndCreatedAtBefore(Status status, LocalDateTime time);
    Optional<Order> findByStripePaymentIntentId(String id);
    List<Order> findByCountry(Country country);

    boolean existsByOrderItems_Item_Id(Long itemId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status NOT IN (com.bijou.backend.entities.Status.AWAITING_PAYMENT, com.bijou.backend.entities.Status.CANCELLED)")
    long countSuccessful();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.status NOT IN (com.bijou.backend.entities.Status.AWAITING_PAYMENT, com.bijou.backend.entities.Status.CANCELLED) AND o.createdAt >= :since")
    long countSuccessfulSince(@Param("since") LocalDateTime since);

    @Query("SELECT COALESCE(SUM(o.taxAmount), 0) FROM Order o WHERE o.status NOT IN (com.bijou.backend.entities.Status.AWAITING_PAYMENT, com.bijou.backend.entities.Status.CANCELLED)")
    java.math.BigDecimal sumTaxTotal();

    @Query("SELECT COALESCE(SUM(o.taxAmount), 0) FROM Order o WHERE o.status NOT IN (com.bijou.backend.entities.Status.AWAITING_PAYMENT, com.bijou.backend.entities.Status.CANCELLED) AND o.createdAt >= :since")
    java.math.BigDecimal sumTaxSince(@Param("since") LocalDateTime since);

    /**
     * All-time sales per (material, pricing formula), across successful orders.
     * Each row: [material, pricingFormula, grams, money, units] where grams uses
     * the purchased size's weight when present (else the item's own weight) and
     * money is quantity × unit price. Bucketed into metal categories by the
     * service. Rows with no matching order items simply don't appear.
     */
    @Query("SELECT i.material, i.pricingFormula, " +
        "COALESCE(SUM(oi.quantity * (CASE WHEN oi.itemSize IS NOT NULL THEN oi.itemSize.weightGrams ELSE i.weightGrams END)), 0), " +
        "COALESCE(SUM(oi.unitPrice * oi.quantity), 0), " +
        "COALESCE(SUM(oi.quantity), 0) " +
        "FROM Order o JOIN o.orderItems oi JOIN oi.item i " +
        "WHERE o.status NOT IN (com.bijou.backend.entities.Status.AWAITING_PAYMENT, com.bijou.backend.entities.Status.CANCELLED) " +
        "GROUP BY i.material, i.pricingFormula")
    List<Object[]> materialSalesTotals();
}
