package com.bijou.backend.services;

import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.event.EventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.bijou.backend.auth.RegisterEvent;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailListener {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final MessageSource messageSource;
    @Value("${spring.mail.sender}")
    private String sender;


    @Async("emailTaskExecutor")
    @EventListener
    public void handleRegistration(RegisterEvent event) {
        String fullName = event.firstName() + " " + event.lastName();

        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());

        Context context =  new Context(locale);
        context.setVariable("fullName",fullName);

        String htmlContent = templateEngine.process("emails/welcome", context);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String subject = messageSource.getMessage("mail.welcome.subject", null, locale);
            helper.setFrom(sender);
            helper.setTo(event.email());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Sent {} registration email to {}", event.language(), event.email());
        } catch (MessagingException e) {
            log.error("Failed to send email to {}", event.email(), e);
        }
    }
}
