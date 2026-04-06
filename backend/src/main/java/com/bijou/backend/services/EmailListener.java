package com.bijou.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.bijou.backend.auth.RegisterEvent;
import com.bijou.backend.entities.Language;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailListener {

    private final JavaMailSender mailSender;
    @Value("${spring.mail.sender}")
    private String sender;


    @Async("emailTaskExecutor")
    @EventListener
    public void handleRegistration(RegisterEvent event) {
        SimpleMailMessage msg = new SimpleMailMessage();

        msg.setFrom(sender);
        msg.setTo(event.email());
        if (event.language() == Language.EN) {
            msg.setSubject("Welcome to BijouMonde!");
            msg.setText("Hi " + event.firstName() + " " + event.lastName() + ",\n\nThanks for joining BijouMonde! Your account is now active.");
        } else if (event.language() == Language.FR) {
            msg.setSubject("Bienvenue à BijouMonde!");
            msg.setText("Salut " + event.firstName() + " " + event.lastName() + ",\n\nMerci d'avoir rejoint BijouMonde! Votre compte est maintenant actif.");
        } else {
            msg.setSubject("Bienvenido a BijouMonde!");
            msg.setText("Hola " + event.firstName() + " " + event.lastName() + ",\n\nGracias por unirte a BijouMonde! Tu cuenta a sido activada.");
        }
        mailSender.send(msg);
        log.info("sent registration email to {}", event.email());
        
    }
    
}
