package com.bijou.backend.auth;

import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    @Value("${JWT_SECRET}")
    private String secretKey;

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(UserDetails userDetails) {
        Date expiration = Date.from(Instant.now().plusSeconds(15 * 60)); // 15 minutes
        return buildToken(userDetails, expiration, "access");
    }

    public String generateRefreshToken(UserDetails userDetails) {
        Date expiration = Date.from(Instant.now().plusSeconds(7L * 24 * 60 * 60)); // 7 days
        return buildToken(userDetails, expiration, "refresh");
    }

    private String buildToken(UserDetails userDetails, Date expiration, String type) {
        String role = userDetails.getAuthorities()
            .stream()
            .findFirst()
            .map(GrantedAuthority::getAuthority)
            .orElse(null);
        return Jwts.builder()
            .expiration(expiration)
            .issuedAt(Date.from(Instant.now()))
            .subject(userDetails.getUsername())
            .claim("role", role)
            .claim("type", type)
            .signWith(getSigningKey())
            .compact();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return (String) extractAllClaims(token).get("role");
    }

    public String extractType(String token) {
        return (String) extractAllClaims(token).get("type");
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    public boolean isTokenValid(String token, UserDetails details) {
        Claims claims = extractAllClaims(token);
        String tokenEmail = claims.getSubject();
        Date expiration = claims.getExpiration();
        return tokenEmail.equals(details.getUsername()) && Instant.now().isBefore(expiration.toInstant());
    }
}
