package com.bijou.backend.services;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.bijou.backend.entities.Client;
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
    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;

    @Transactional
    public void create(Client client, OrderRequest req) {
        List<Long> itemIds = req.items().stream()
            .map(OrderItemRequest::itemId)
            .distinct()
            .toList();

        Map<Long, Item> itemMap = itemRepository.findAllById(itemIds)
            .stream()
            .collect(Collectors.toMap(Item::getId, item -> item));

        // then check all items were found
        if (itemMap.size() != itemIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "one or more items not found");
        }
        //check if we have sufficient stock
        for (OrderItemRequest orderItem : req.items()) {
            Item item = itemMap.get(orderItem.itemId());
            if (item.getStock() < orderItem.quantity()) {
                log.warn("item {} has insufficient stock", item.getName());
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                    "insufficient stock for item: " + item.getName());
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
            .build();
        order.getOrderItems().forEach(oi -> oi.setOrder(order));
        orderRepository.save(order);
    }

    @Transactional
    public void cancel(Client client, Long orderid) {
        Order order = orderRepository.findById(orderid).orElseThrow( () ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "order not found")
                );
        if (!order.getClient().getId().equals(client.getId()) && client.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "client does not own order");
        } 

        if (order.getStatus() == Status.CANCELLED ||
            order.getStatus() == Status.SHIPPED ||
            order.getStatus() == Status.DELIVERED)
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "order cannot be cancelled, current status: " + order.getStatus());

        //we can go ahead and cancel the order
        List<OrderItem> orderItems = order.getOrderItems();
        List<Long> itemIds = orderItems.stream()
            .map(orderItem -> orderItem.getItem().getId())
            .distinct()
            .toList();
        Map<Long, Item> itemMap = itemRepository.findAllById(itemIds).stream()
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
    }

    public List<OrderView> getOrders(Client client) {
        List<Order> orders = orderRepository.findByClient(client);
        return orders.stream()
            .map(order -> new OrderView(order.getAddress(), order.getOrderItems().stream()
                .map(orderItem -> 
                    new OrderItemView(
                            orderItem.getItem().getId(),
                            orderItem.getUnitPrice(),
                            orderItem.getQuantity())
                    )
                .toList(),
                order.getTrackingNumber(),
                order.getTotalPrice(),
                order.getCreatedAt(),
                order.getStatus(),
                order.getId()))
            .toList();
    }
}
