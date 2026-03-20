package com.bijou.backend.repositories;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bijou.backend.entities.Client;
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
}
