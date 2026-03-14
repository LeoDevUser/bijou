package com.bijou.backend.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "items")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Item {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) 
    private Long id;
    @Column(nullable=false)
    private Integer stock;
    @Column(nullable=false)
    private BigDecimal price;
    @Column(nullable=false, unique = true)
    private String name;
    @ElementCollection
    @CollectionTable(name = "item_labels", joinColumns = @JoinColumn(name = "item_id"))
    private List<String> labels;
    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private Category category;
}
