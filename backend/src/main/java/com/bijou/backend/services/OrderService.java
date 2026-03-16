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
    public void createOrder(Client client, OrderRequest req) {
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
}
