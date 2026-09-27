package com.bijou.backend.repositories;

import java.time.LocalDateTime;
import java.util.Collection;
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
import com.bijou.backend.entities.Store;

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

    /**
     * Item subtotal per (order, store) across successful orders — one row per
     * store present in the order. Each row: [orderId, createdAt, taxAmount, store,
     * subtotal]. The service turns these into per-store shares so a mixed order's
     * count and tax can be split by the value of the items each store sold.
     */
    @Query("SELECT o.id, o.createdAt, o.taxAmount, i.store, SUM(oi.unitPrice * oi.quantity) " +
        "FROM Order o JOIN o.orderItems oi JOIN oi.item i " +
        "WHERE o.status NOT IN (com.bijou.backend.entities.Status.AWAITING_PAYMENT, com.bijou.backend.entities.Status.CANCELLED) " +
        "GROUP BY o.id, o.createdAt, o.taxAmount, i.store")
    List<Object[]> successfulOrderStoreSubtotals();

    /**
     * All-time sales per (material, pricing formula), across successful orders.
     * Each row: [material, pricingFormula, grams, money, units] where grams uses
     * the purchased size's weight when present (else the item's own weight) and
     * money is quantity × unit price. Bucketed into metal categories by the
     * service. Only items owned by one of {@code stores} are counted. Rows with
     * no matching order items simply don't appear.
     */
    @Query("SELECT i.material, i.pricingFormula, " +
        "COALESCE(SUM(oi.quantity * (CASE WHEN oi.itemSize IS NOT NULL THEN oi.itemSize.weightGrams ELSE i.weightGrams END)), 0), " +
        "COALESCE(SUM(oi.unitPrice * oi.quantity), 0), " +
        "COALESCE(SUM(oi.quantity), 0) " +
        "FROM Order o JOIN o.orderItems oi JOIN oi.item i " +
        "WHERE o.status NOT IN (com.bijou.backend.entities.Status.AWAITING_PAYMENT, com.bijou.backend.entities.Status.CANCELLED) " +
        "AND i.store IN :stores " +
        "GROUP BY i.material, i.pricingFormula")
    List<Object[]> materialSalesTotals(@Param("stores") Collection<Store> stores);
}
