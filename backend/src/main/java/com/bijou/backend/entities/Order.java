package com.bijou.backend.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="orders")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private BigDecimal totalPrice;
    @Column(nullable = false)
    private String address;
    private String trackingNumber;
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Status status;
    @ManyToOne
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;
    @OneToMany(mappedBy = "order")
    private List<OrderItem> orderItems;

    @PrePersist
    protected void onCreate(){
        this.createdAt = LocalDateTime.now();
        this.status = Status.AWAITING_PAYMENT;
    }
}
