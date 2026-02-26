package com.bijou.backend.auth;

import java.io.IOException;
import java.util.Optional;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.bijou.backend.entities.Client;
import com.bijou.backend.repositories.ClientRepository;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final ClientRepository clientRepository;

   @Override
   protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain filterChain) 
       throws ServletException, IOException {

       String authHeader = req.getHeader("Authorization");
       if (authHeader == null || !authHeader.startsWith("Bearer ")) {
           filterChain.doFilter(req, res);
           return;
       }

       String token = authHeader.substring(7);


       try {
           String email = jwtService.extractEmail(token);
           if(email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
               Optional<Client> opUserDetails = clientRepository.findByEmail(email);
               if (opUserDetails.isPresent()) {
                   Client client = opUserDetails.get();
                   if(jwtService.isTokenValid(token, client)) {
                       UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(client, null, client.getAuthorities());
                       auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                       SecurityContextHolder.getContext().setAuthentication(auth);
                   }
               }
           }

       } catch (ExpiredJwtException | MalformedJwtException | SecurityException e) {
           res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
           return;
       }
       filterChain.doFilter(req, res);
   }
}
