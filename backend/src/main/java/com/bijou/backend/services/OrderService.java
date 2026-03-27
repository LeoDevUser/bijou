package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Client;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.Item;
import com.bijou.backend.entities.Order;
import com.bijou.backend.entities.OrderItem;
import com.bijou.backend.entities.Role;
import com.bijou.backend.entities.Status;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.OrderRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {
    private static final Map<Status, Set<Status>> VALID_TRANSITIONS = Map.of(
        Status.AWAITING_PAYMENT, Set.of(Status.PROCESSING),
        Status.PROCESSING,       Set.of(Status.SHIPPED, Status.CANCELLED),
        Status.SHIPPED,          Set.of(Status.DELIVERED, Status.CANCELLED),
        Status.DELIVERED,        Set.of(),
        Status.CANCELLED,        Set.of()
    );

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;

    @Transactional
    public Order create(Client client, OrderRequest req) {
        List<Long> itemIds = req.items().stream()
            .map(OrderItemRequest::itemId)
            .distinct()
            .toList();

        Map<Long, Item> itemMap = itemRepository.findAllByIdWithLock(itemIds)
            .stream()
            .collect(Collectors.toMap(Item::getId, item -> item));

        // then check all items were found
        if (itemMap.size() != itemIds.size()) {
            throw new AppException(HttpStatus.NOT_FOUND, "ITEMS_NOT_FOUND");
        }
        //check if we have sufficient stock
        for (OrderItemRequest orderItem : req.items()) {
            Item item = itemMap.get(orderItem.itemId());
            if (item.getStock() < orderItem.quantity()) {
                log.warn("item {} has insufficient stock", item.getNameEn());
                throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "INSUFFICIENT_STOCK", item.getNameEn());
            }
        }
        
        //update stock
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest orderItemReq : req.items()) {
            Item item = itemMap.get(orderItemReq.itemId());
            item.setStock(item.getStock() - orderItemReq.quantity());
            OrderItem orderItem = OrderItem.builder()
                .item(item)
                .quantity(orderItemReq.quantity())
                .unitPrice(item.getPrice())
                .build();
            orderItems.add(orderItem);
            total = total.add(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())));
        }


        //update order and link OrderItems
        Order order = Order.builder()
            .address(req.address())
            .orderItems(orderItems)
            .totalPrice(total)
            .client(client)
            .country(req.country())
            .build();
        order.getOrderItems().forEach(oi -> oi.setOrder(order));
        orderRepository.save(order);
        return order;
    }

    @Transactional
    public String cancel(Client client, Long orderid) {
        Order order = orderRepository.findById(orderid).orElseThrow( () ->
                new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND")
                );
        if (!order.getClient().getId().equals(client.getId()) && client.getRole() != Role.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "ORDER_ACCESS_DENIED");
        }

        if (order.getStatus() == Status.CANCELLED ||
            order.getStatus() == Status.SHIPPED ||
            order.getStatus() == Status.DELIVERED)
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "ORDER_CANCEL_NOT_ALLOWED", order.getStatus().toString());

        //we can go ahead and cancel the order
        List<OrderItem> orderItems = order.getOrderItems();
        List<Long> itemIds = orderItems.stream()
            .map(orderItem -> orderItem.getItem().getId())
            .distinct()
            .toList();
        Map<Long, Item> itemMap = itemRepository.findAllByIdWithLock(itemIds).stream()
            .collect(Collectors.toMap(Item::getId, item -> item));

        orderItems.forEach(orderItem -> {
            Item item = itemMap.get(orderItem.getItem().getId());
            if (item == null) {
                log.warn("item {} no longer exists, skipping stock restoration", orderItem.getItem().getId());
                return;
            }
            item.setStock(item.getStock() + orderItem.getQuantity());
        });

        order.setStatus(Status.CANCELLED);
        orderRepository.save(order);
        return order.getStripePaymentIntentId();
    }

    @Transactional
    public void updateSales(Client client, Long orderid) {
        Order order = orderRepository.findById(orderid).orElseThrow( () ->
                new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND")
                );
        if (order.getStatus() == Status.CANCELLED ||
            order.getStatus() == Status.SHIPPED ||
            order.getStatus() == Status.DELIVERED)
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "ORDER_CANCEL_NOT_ALLOWED", order.getStatus().toString());

        //we can go ahead and update the items in the order
        List<OrderItem> orderItems = order.getOrderItems();
        List<Long> itemIds = orderItems.stream()
            .map(orderItem -> orderItem.getItem().getId())
            .distinct()
            .toList();
        Map<Long, Item> itemMap = itemRepository.findAllByIdWithLock(itemIds).stream()
            .collect(Collectors.toMap(Item::getId, item -> item));

        orderItems.forEach(orderItem -> {
            Item item = itemMap.get(orderItem.getItem().getId());
            if (item == null) {
                log.warn("item {} no longer exists, skipping sales update", orderItem.getItem().getId());
                return;
            }
            item.setNbSold(orderItem.getQuantity() + item.getNbSold());
            BigDecimal totalSold = orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity()));
            item.setTotalSales(totalSold.add(item.getTotalSales()));
        });

        order.setStatus(Status.PROCESSING);
        orderRepository.save(order);
        log.info("order {} moved to PROCESSING after successful payment", order.getId());
    }

    public OrderView toOrderView(Order order) {
        Client client = order.getClient();
        return new OrderView(order.getAddress(),
                client.getEmail(),
                client.getFirstName(),
                client.getLastName(),
                order.getOrderItems().stream()
                .map(orderItem -> 
                    new OrderItemView(
                        orderItem.getItem().getId(),
                        orderItem.getUnitPrice(),
                        orderItem.getQuantity()
                    )
                ).toList(),
                order.getTrackingNumber(),
                order.getTotalPrice(),
                order.getCreatedAt(),
                order.getStatus(),
                order.getId(),
                order.getCountry());
    }

    @Transactional
    public List<OrderView> getOrders(Client client) {
        List<Order> orders = orderRepository.findByClient(client);
        return orders.stream()
            .map(order -> toOrderView(order))
            .toList();
    }


    @Transactional
    public OrderView getOrder(Client client, Long id) {
        Order order = orderRepository.findById(id).orElseThrow( () ->
                new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND")
            );
        if (client.getRole() != Role.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "ADMIN_ONLY");
        } 
        return toOrderView(order);
    }

    @Transactional
    public List<OrderView> getAllOrders(Client client) {
        if (client.getRole() != Role.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "ADMIN_ONLY");
        }
        return orderRepository.findAll()
            .stream()
            .map(order -> toOrderView(order))
            .toList();
    }

    @Transactional
    public List<OrderView> getOrdersByStatus(Client client, Status status) {
        if (client.getRole() != Role.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, "ADMIN_ONLY");
        }
        return orderRepository.findByStatus(status)
            .stream()
            .map(order -> toOrderView(order))
            .toList();
    }

    @Transactional
    public List<OrderView> getOrdersByCountry(Country country) {
        return orderRepository.findByCountry(country)
            .stream()
            .map(order -> toOrderView(order))
            .toList();
    }
    
    @Transactional
    public void changeStatus(Long id, Status status) {
        Order order = orderRepository.findById(id).orElseThrow( () ->
                new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND")
            );
        if (!VALID_TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).contains(status)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }
        if (status == Status.CANCELLED) {
            cancel(order.getClient(), id);
            return;
        }
        Status oldStatus = order.getStatus();
        order.setStatus(status);
        orderRepository.save(order);
        log.info("order {} changed status from {} to {}", order.getId(), oldStatus, order.getStatus());
    }
}
