package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

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
    private final ApplicationEventPublisher eventPublisher;
    private final TaxService taxService;
    private final CloudinaryService cloudinaryService;
    private final AppSettingsService appSettingsService;

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
            BigDecimal unitPrice = item.getDiscountPercent() != null && item.getDiscountPercent() > 0
                ? item.getPrice().multiply(BigDecimal.valueOf(100 - item.getDiscountPercent()).movePointLeft(2))
                : item.getPrice();
            OrderItem orderItem = OrderItem.builder()
                .item(item)
                .quantity(orderItemReq.quantity())
                .unitPrice(unitPrice)
                .build();
            orderItems.add(orderItem);
            total = total.add(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())));
        }


        // Apply duties, taxes, and international handling fee
        TaxResult taxResult = taxService.calculate(orderItems, req.country(), total);
        BigDecimal dutyAmount    = taxResult.dutyAmount();
        BigDecimal taxAmount     = taxResult.taxAmount();
        BigDecimal handlingFee   = taxResult.handlingFee();
        total = total.add(taxResult.total());
        log.info("tax breakdown — duty: {}, tax: {}, handling: {}", dutyAmount, taxAmount, handlingFee);

        // Apply MSI fee if applicable (MXN only, above 2000 MXN, valid plan)
        Integer installments = req.installments();
        if (installments != null) {
            if (!appSettingsService.isMsiEnabled()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "MSI_DISABLED");
            }
            if (req.currency() != Currency.MXN) {
                throw new AppException(HttpStatus.BAD_REQUEST, "MSI_MXN_ONLY");
            }
            if (total.compareTo(new BigDecimal("2000")) < 0) {
                throw new AppException(HttpStatus.BAD_REQUEST, "MSI_MINIMUM_NOT_MET");
            }
            BigDecimal feeRate = switch (installments) {
                case 3  -> new BigDecimal("0.02");
                case 6  -> new BigDecimal("0.04");
                case 9  -> new BigDecimal("0.06");
                case 12 -> new BigDecimal("0.08");
                default -> throw new AppException(HttpStatus.BAD_REQUEST, "MSI_INVALID_PLAN");
            };
            total = total.multiply(BigDecimal.ONE.add(feeRate)).setScale(2, RoundingMode.HALF_UP);
        }

        // Validate colonial for Mexico orders
        if (req.country() == com.bijou.backend.entities.Country.MEXICO
                && (req.colonial() == null || req.colonial().isBlank())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "COLONIAL_REQUIRED");
        }

        //update order and link OrderItems
        Order order = Order.builder()
            .addressLine1(req.addressLine1())
            .addressLine2(req.addressLine2())
            .colonial(req.colonial())
            .city(req.city())
            .state(req.state())
            .postalCode(req.postalCode())
            .country(req.country())
            .orderItems(orderItems)
            .totalPrice(total)
            .installments(installments)
            .dutyAmount(dutyAmount)
            .taxAmount(taxAmount)
            .handlingFee(handlingFee)
            .client(client)
            .build();
        order.getOrderItems().forEach(oi -> oi.setOrder(order));
        orderRepository.save(order);
        log.info("created order #{} for client {} (total: {})", order.getId(), client.getEmail(), total);

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
        log.info("cancelled order #{} for client {}", order.getId(), client.getEmail());
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

        // Atomic SQL increments — avoids lost-update when two orders containing the
        // same item are confirmed concurrently. No pessimistic lock needed here because
        // each UPDATE operates atomically at the DB level.
        List<OrderItem> orderItems = order.getOrderItems();
        orderItems.forEach(orderItem -> {
            BigDecimal totalSold = orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity()));
            itemRepository.incrementSalesStats(
                    orderItem.getItem().getId(), orderItem.getQuantity(), totalSold);
        });

        order.setStatus(Status.PROCESSING);
        orderRepository.save(order);
        log.info("order {} moved to PROCESSING after successful payment", order.getId());
    }

    public TaxPreviewResponse taxPreview(TaxPreviewRequest req) {
        List<Long> itemIds = req.items().stream()
            .map(OrderItemRequest::itemId)
            .distinct()
            .toList();
        Map<Long, Item> itemMap = itemRepository.findAllById(itemIds)
            .stream()
            .collect(Collectors.toMap(Item::getId, item -> item));

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderItemRequest r : req.items()) {
            Item item = itemMap.get(r.itemId());
            if (item == null) continue;
            BigDecimal unitPrice = item.getDiscountPercent() != null && item.getDiscountPercent() > 0
                ? item.getPrice().multiply(BigDecimal.valueOf(100 - item.getDiscountPercent()).movePointLeft(2))
                : item.getPrice();
            OrderItem oi = OrderItem.builder().item(item).quantity(r.quantity()).unitPrice(unitPrice).build();
            orderItems.add(oi);
            subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(r.quantity())));
        }

        TaxResult taxResult = taxService.calculate(orderItems, req.country(), subtotal);
        return new TaxPreviewResponse(
            subtotal.setScale(2, RoundingMode.HALF_UP),
            taxResult.dutyAmount(),
            taxResult.taxAmount(),
            taxResult.handlingFee(),
            subtotal.add(taxResult.total()).setScale(2, RoundingMode.HALF_UP)
        );
    }

    public OrderView toOrderView(Order order) {
        Client client = order.getClient();
        return new OrderView(
                order.getAddressLine1(),
                order.getAddressLine2(),
                order.getColonial(),
                order.getCity(),
                order.getState(),
                order.getPostalCode(),
                client.getEmail(),
                client.getFirstName(),
                client.getLastName(),
                order.getOrderItems().stream()
                .map(orderItem -> {
                    var item = orderItem.getItem();
                    return new OrderItemView(
                        item.getId(),
                        orderItem.getUnitPrice(),
                        orderItem.getQuantity(),
                        item.getNameEn(),
                        item.getNameFr(),
                        item.getNameEs(),
                        item.getAssets().isEmpty() ? null : item.getAssets().get(0).getImageUrl(),
                        item.getAssets().isEmpty() ? "image" : item.getAssets().get(0).getResourceType(),
                        item.isActive()
                    );
                }).toList(),
                order.getTrackingNumber(),
                order.getTotalPrice(),
                order.getCreatedAt(),
                order.getStatus(),
                order.getId(),
                order.getCountry(),
                order.getInstallments(),
                order.isOxxo(),
                order.isBankTransfer(),
                order.getDutyAmount(),
                order.getTaxAmount(),
                order.getHandlingFee(),
                order.getFacturaUrl());
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

        if (status == Status.SHIPPED) {
            Client client = order.getClient();
            List<OrderShippedEvent.ItemLine> lines = order.getOrderItems().stream()
                .map(oi -> {
                    String en = oi.getItem().getNameEn();
                    String fr = oi.getItem().getNameFr();
                    String es = oi.getItem().getNameEs();
                    String name = switch (client.getLanguage()) {
                        case FR -> fr != null ? fr : (en != null ? en : es);
                        case ES -> es != null ? es : (en != null ? en : fr);
                        default -> en != null ? en : (fr != null ? fr : es);
                    };
                    return new OrderShippedEvent.ItemLine(name, oi.getQuantity(), oi.getUnitPrice());
                }).toList();
            eventPublisher.publishEvent(new OrderShippedEvent(
                client.getEmail(),
                client.getFirstName(),
                client.getLanguage(),
                order.getId(),
                order.getTrackingNumber(),
                lines
            ));
        }
    }

    @Transactional
    public void setTracking(Long id, String tracking) {
        Order order = orderRepository.findById(id).orElseThrow( () ->
                new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND")
            );
        order.setTrackingNumber(tracking);
        orderRepository.save(order);
        log.info("set tracking number {} for order {}", order.getTrackingNumber(),order.getId());
    }

    public void sendFacturaEmail(Long id) {
        Order order = orderRepository.findById(id).orElseThrow(() ->
                new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        if (order.getFacturaUrl() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "FACTURA_NOT_UPLOADED");
        }

        Client client = order.getClient();
        eventPublisher.publishEvent(new FacturaEmailEvent(
                client.getEmail(),
                client.getFirstName(),
                client.getLanguage(),
                order.getId(),
                order.getFacturaUrl()
        ));
        log.info("dispatched factura email event for order {}", id);
    }

    @Transactional
    public OrderView uploadFactura(Long id, MultipartFile file) {
        Order order = orderRepository.findById(id).orElseThrow(() ->
                new AppException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        if (order.getCountry() != Country.MEXICO) {
            throw new AppException(HttpStatus.BAD_REQUEST, "FACTURA_MEXICO_ONLY");
        }

        if (order.getFacturaId() != null) {
            cloudinaryService.delete(order.getFacturaId(), "raw");
        }

        CloudinaryResponse uploaded = cloudinaryService.uploadPdf(file);
        order.setFacturaId(uploaded.imageId());
        order.setFacturaUrl(uploaded.url());
        orderRepository.save(order);
        log.info("uploaded factura for order {}", id);
        return toOrderView(order);
    }
}
