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

import com.bijou.backend.entities.CfdiUso;
import com.bijou.backend.entities.Client;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.entities.Country;
import com.bijou.backend.entities.RegimenFiscal;
import com.bijou.backend.entities.Item;
import com.bijou.backend.entities.ItemSize;
import com.bijou.backend.entities.Order;
import com.bijou.backend.entities.OrderItem;
import com.bijou.backend.entities.Role;
import com.bijou.backend.entities.Status;
import com.bijou.backend.repositories.ClientRepository;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.OrderRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {
    // Mexican RFC: 12 chars (persona moral) or 13 (persona física), homoclave included.
    private static final java.util.regex.Pattern RFC_PATTERN =
        java.util.regex.Pattern.compile("^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$");

    private static final Map<Status, Set<Status>> VALID_TRANSITIONS = Map.of(
        Status.AWAITING_PAYMENT, Set.of(Status.PROCESSING),
        Status.PROCESSING,       Set.of(Status.SHIPPED, Status.CANCELLED),
        Status.SHIPPED,          Set.of(Status.DELIVERED, Status.CANCELLED),
        Status.DELIVERED,        Set.of(),
        Status.CANCELLED,        Set.of()
    );

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final ClientRepository clientRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TaxService taxService;
    private final ShippingService shippingService;
    private final CloudinaryService cloudinaryService;
    private final AppSettingsService appSettingsService;

    @Transactional
    public Order create(Client client, OrderRequest req) {
        // Mexico-only launch — reject anything else even if a stale client sends it
        if (req.country() != Country.MEXICO) {
            throw new AppException(HttpStatus.BAD_REQUEST, "SHIPPING_MEXICO_ONLY");
        }

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
        // Check stock and decrement in one pass (whole method is transactional, so any
        // later failure rolls the decrements back). Sized items draw from the chosen
        // size's stock and price; single-option items from the item's own.
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItemRequest orderItemReq : req.items()) {
            Item item = itemMap.get(orderItemReq.itemId());
            OrderItem.OrderItemBuilder builder = OrderItem.builder().item(item).quantity(orderItemReq.quantity());
            BigDecimal basePrice;
            if (!item.getSizes().isEmpty()) {
                ItemSize size = item.getSizes().stream()
                    .filter(s -> s.getId().equals(orderItemReq.sizeId()))
                    .findFirst()
                    .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, "SIZE_REQUIRED", item.getNameEn()));
                if (size.getStock() < orderItemReq.quantity()) {
                    log.warn("size {} of item {} has insufficient stock", size.getSize(), item.getNameEn());
                    throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "INSUFFICIENT_STOCK", item.getNameEn());
                }
                size.setStock(size.getStock() - orderItemReq.quantity());
                basePrice = size.getPrice();
                builder.itemSize(size).sizeLabel(size.getSize());
            } else {
                if (item.getStock() < orderItemReq.quantity()) {
                    log.warn("item {} has insufficient stock", item.getNameEn());
                    throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "INSUFFICIENT_STOCK", item.getNameEn());
                }
                item.setStock(item.getStock() - orderItemReq.quantity());
                basePrice = item.getPrice();
            }
            BigDecimal unitPrice = item.getDiscountPercent() != null && item.getDiscountPercent() > 0
                ? basePrice.multiply(BigDecimal.valueOf(100 - item.getDiscountPercent()).movePointLeft(2))
                : basePrice;
            OrderItem orderItem = builder.unitPrice(unitPrice).build();
            orderItems.add(orderItem);
            total = total.add(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())));
        }


        // Apply duties, taxes, and international handling fee
        TaxResult taxResult = taxService.calculate(orderItems, req.country(), total);
        BigDecimal dutyAmount    = taxResult.dutyAmount();
        BigDecimal taxAmount     = taxResult.taxAmount();
        BigDecimal handlingFee   = taxResult.handlingFee();
        BigDecimal shippingFee   = shippingService.fee(req.country(), req.state(), total);
        total = total.add(taxResult.total()).add(shippingFee);
        log.info("fee breakdown — duty: {}, tax: {}, handling: {}, shipping: {}",
            dutyAmount, taxAmount, handlingFee, shippingFee);

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

        // Factura (CFDI) request — validate fiscal data and persist it onto the client
        // so it is reused on future orders. The uso must be valid for the régimen (SAT matrix).
        // rfc / regimen are also snapshotted onto the order below.
        CfdiUso cfdiUso = null;
        String rfc = null;
        RegimenFiscal regimen = null;
        if (req.facturaRequested()) {
            regimen = req.regimenFiscal() != null ? req.regimenFiscal() : client.getRegimenFiscal();
            rfc = req.rfc() != null && !req.rfc().isBlank()
                ? req.rfc().trim().toUpperCase()
                : client.getRfc();
            cfdiUso = req.cfdiUso();
            if (rfc == null || rfc.isBlank() || regimen == null || cfdiUso == null) {
                throw new AppException(HttpStatus.BAD_REQUEST, "FACTURA_FISCAL_DATA_REQUIRED");
            }
            if (!RFC_PATTERN.matcher(rfc).matches()) {
                throw new AppException(HttpStatus.BAD_REQUEST, "RFC_INVALID");
            }
            if (!regimen.allows(cfdiUso)) {
                throw new AppException(HttpStatus.BAD_REQUEST, "CFDI_USO_INVALID_FOR_REGIMEN");
            }
            // Persist / update the client's fiscal identity. The client comes from the
            // security principal (loaded in JwtAuthFilter, outside this transaction), so it
            // is detached — the mutations below won't flush unless we explicitly save it.
            client.setRfc(rfc);
            client.setRegimenFiscal(regimen);
            clientRepository.save(client);
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
            .shippingFee(shippingFee)
            .facturaRequested(req.facturaRequested())
            .cfdiUso(cfdiUso)
            .rfc(rfc)
            .regimenFiscal(regimen)
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
            if (orderItem.getItemSize() != null) {
                // Restore to the specific size; skip if the size was since deleted.
                Long sizeId = orderItem.getItemSize().getId();
                item.getSizes().stream()
                    .filter(s -> s.getId().equals(sizeId))
                    .findFirst()
                    .ifPresentOrElse(
                        s -> s.setStock(s.getStock() + orderItem.getQuantity()),
                        () -> log.warn("size {} no longer exists, skipping stock restoration", sizeId));
            } else {
                item.setStock(item.getStock() + orderItem.getQuantity());
            }
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
            BigDecimal basePrice = item.getPrice();
            if (r.sizeId() != null && !item.getSizes().isEmpty()) {
                basePrice = item.getSizes().stream()
                    .filter(s -> s.getId().equals(r.sizeId()))
                    .findFirst()
                    .map(ItemSize::getPrice)
                    .orElse(item.getPrice());
            }
            BigDecimal unitPrice = item.getDiscountPercent() != null && item.getDiscountPercent() > 0
                ? basePrice.multiply(BigDecimal.valueOf(100 - item.getDiscountPercent()).movePointLeft(2))
                : basePrice;
            OrderItem oi = OrderItem.builder().item(item).quantity(r.quantity()).unitPrice(unitPrice).build();
            orderItems.add(oi);
            subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(r.quantity())));
        }

        TaxResult taxResult = taxService.calculate(orderItems, req.country(), subtotal);
        BigDecimal shippingFee = shippingService.fee(req.country(), req.state(), subtotal);
        return new TaxPreviewResponse(
            subtotal.setScale(2, RoundingMode.HALF_UP),
            taxResult.dutyAmount(),
            taxResult.taxAmount(),
            taxResult.handlingFee(),
            shippingFee,
            subtotal.add(taxResult.total()).add(shippingFee).setScale(2, RoundingMode.HALF_UP)
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
                        orderItem.getSizeLabel(),
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
                order.getShippingFee(),
                order.getFacturaUrl(),
                order.isFacturaRequested(),
                order.getCfdiUso(),
                order.getRfc(),
                order.getRegimenFiscal());
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
