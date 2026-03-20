package com.bijou.backend.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.bijou.backend.entities.Order;
import com.bijou.backend.entities.Status;
import com.bijou.backend.repositories.OrderRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderCleanupJob {
    private final OrderService orderService;
    private final OrderRepository orderRepository;

    @Scheduled(cron = "0 0 * * * *")
    public void cleanupStaleOrders() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
        List<Order> staleOrders = orderRepository.findByStatusAndCreatedAtBefore(Status.AWAITING_PAYMENT, cutoff);
        
        for (Order order : staleOrders) {
            try {
                orderService.cancel(order.getClient(), order.getId());
            } catch (Exception e) {
                log.error("failed to cancel stale order {}: {}", order.getId(), e.getMessage());
            }
        }
    }
}
