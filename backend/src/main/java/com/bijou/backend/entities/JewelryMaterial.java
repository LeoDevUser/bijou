package com.bijou.backend.entities;

/**
 * Material classification for jewelry items, mapped to HTS codes used for customs duties.
 *
 * HTS 7113.11 — Silver jewelry
 * HTS 7113.19 — Gold jewelry
 * HTS 7117.19 — Steel (base-metal) jewelry
 */
public enum JewelryMaterial {
    SILVER,
    GOLD,
    STEEL
}
