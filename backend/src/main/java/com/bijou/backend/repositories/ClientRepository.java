package com.bijou.backend.repositories;

import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Role;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    Optional<Client> findByEmail(String email);
    List<Client> findAllByRole(Role role);

    /** Acquires a pessimistic write lock on a single client (used during Stripe customer creation). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Client c WHERE c.id = :id")
    Optional<Client> findByIdWithLock(@Param("id") Long id);

    /** Atomically increments order stats — avoids lost-update race when two orders succeed simultaneously. */
    @Modifying
    @Query("UPDATE Client c SET c.nbSuccessfulOrders = c.nbSuccessfulOrders + 1, c.moneySpent = c.moneySpent + :amount WHERE c.id = :id")
    void incrementStats(@Param("id") Long id, @Param("amount") BigDecimal amount);
}
