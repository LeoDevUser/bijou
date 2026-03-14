package com.bijou.backend.auth;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
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

    public String generateToken(UserDetails userDetails) {
        Date expiration = Date.from(LocalDateTime.now().plusDays(1).atZone(ZoneId.systemDefault()).toInstant());
        Date now = Date.from(LocalDateTime.now().atZone(ZoneId.systemDefault()).toInstant());
        String userName  = userDetails.getUsername();
        String role = userDetails.getAuthorities()
            .stream()
            .findFirst()
            .map(GrantedAuthority::getAuthority)
            .orElse(null);
        String jwt = Jwts.builder()
            .expiration(expiration)
            .issuedAt(now)
            .subject(userName)
            .claim("role", role)
            .signWith(getSigningKey())
            .compact();

        return jwt;
    }
    
    public String generateToken(UserDetails userDetails, Date expiration) {
        Date now = Date.from(LocalDateTime.now().atZone(ZoneId.systemDefault()).toInstant());
        String userName  = userDetails.getUsername();
        String role = userDetails.getAuthorities()
            .stream()
            .findFirst()
            .map(GrantedAuthority::getAuthority)
            .orElse(null);
        String jwt = Jwts.builder()
            .expiration(expiration)
            .issuedAt(now)
            .subject(userName)
            .claim("role", role)
            .signWith(getSigningKey())
            .compact();

        return jwt;
    }

    public String extractEmail(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .getSubject();
    }

    public String extractRole(String token) {
        return (String) Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload()
            .get("role");
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
        Date now = Date.from(Instant.now());
        return tokenEmail.equals(details.getUsername()) && now.before(expiration);
    }

}
