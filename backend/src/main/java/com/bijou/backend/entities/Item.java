package com.bijou.backend.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.util.ArrayList;
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
    @Version
    private Long version;
    @Column(nullable=false)
    private Integer stock;
    @Column(nullable=false)
    private BigDecimal price;
    private String nameEn;
    private String nameFr;
    private String nameEs;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "item_labels",
        joinColumns = @JoinColumn(name = "item_id"),
        inverseJoinColumns = @JoinColumn(name = "label_id")
    )
    private List<Label> labels;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;
    @OneToMany(mappedBy = "item", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<ItemAsset> assets = new ArrayList<>();
    @Column(nullable = false)
    @Builder.Default
    private int nbSold = 0;
    @Builder.Default
    private int nbSoldMonth = 0;
    @Builder.Default
    private BigDecimal totalSalesWeek = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSalesMonth = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSalesQuarter = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSalesYear = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalSales = BigDecimal.ZERO;
    @Builder.Default
    private boolean active = true;
    private String descriptionEn;
    private String descriptionFr;
    private String descriptionEs;
    private Integer discountPercent;
    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private JewelryMaterial material;
    @Builder.Default
    @Column(nullable = false)
    private boolean usmcaQualified = false;
}
