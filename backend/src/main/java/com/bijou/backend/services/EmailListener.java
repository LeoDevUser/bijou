package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    public void handleOrderConfirmation(OrderConfirmationEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());

        Context context = new Context(locale);
        context.setVariable("firstName", event.firstName());
        context.setVariable("orderId", event.orderId());
        context.setVariable("items", event.items());
        context.setVariable("total", event.total());
        context.setVariable("address", event.address());
        context.setVariable("city", event.city());
        context.setVariable("postalCode", event.postalCode());
        context.setVariable("country", event.country());
        context.setVariable("oxxoVoucherUrl", event.oxxoVoucherUrl());
        context.setVariable("isOxxo", event.oxxoVoucherUrl() != null);
        context.setVariable("oxxoPayment", event.oxxoPayment());
        context.setVariable("installments", event.installments());
        context.setVariable("hasMsi", event.installments() != null);
        if (event.installments() != null) {
            BigDecimal monthly = event.total().divide(
                BigDecimal.valueOf(event.installments()), 2, RoundingMode.HALF_UP);
            context.setVariable("monthlyPayment", monthly);
            int feePct = switch (event.installments()) {
                case 3 -> 2; case 6 -> 4; case 9 -> 6; case 12 -> 8; default -> 0;
            };
            context.setVariable("msiFeePct", feePct);
            BigDecimal feeRate = BigDecimal.valueOf(feePct).movePointLeft(2);
            BigDecimal originalTotal = event.total().divide(BigDecimal.ONE.add(feeRate), 2, RoundingMode.HALF_UP);
            context.setVariable("originalTotal", originalTotal);
            context.setVariable("msiFeeAmount", event.total().subtract(originalTotal));
        }

        String htmlContent = templateEngine.process("emails/order-confirmation", context);

        boolean isOxxo = event.oxxoVoucherUrl() != null;
        log.info("sending {} email for order #{} to {}",
            isOxxo ? "order-placed (OXXO)" : "payment-confirmed", event.orderId(), event.email());

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String subject = messageSource.getMessage("mail.order.subject",
                new Object[]{ event.orderId() }, locale);
            helper.setFrom(sender);
            helper.setTo(event.email());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("sent {} email for order #{} to {}",
                isOxxo ? "order-placed (OXXO)" : "payment-confirmed", event.orderId(), event.email());
        } catch (MessagingException e) {
            log.error("failed to send order confirmation email for order #{} to {}", event.orderId(), event.email(), e);
        }
    }

    @Async("emailTaskExecutor")
    @EventListener
    public void handleOrderReceived(OrderReceivedEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());

        Context context = new Context(locale);
        context.setVariable("firstName", event.firstName());
        context.setVariable("orderId", event.orderId());
        context.setVariable("items", event.items());
        context.setVariable("total", event.total());
        context.setVariable("address", event.address());
        context.setVariable("city", event.city());
        context.setVariable("postalCode", event.postalCode());
        context.setVariable("country", event.country());
        context.setVariable("installments", event.installments());
        context.setVariable("hasMsi", event.installments() != null);
        if (event.installments() != null) {
            BigDecimal monthly = event.total().divide(
                BigDecimal.valueOf(event.installments()), 2, RoundingMode.HALF_UP);
            context.setVariable("monthlyPayment", monthly);
            int feePct = switch (event.installments()) {
                case 3 -> 2; case 6 -> 4; case 9 -> 6; case 12 -> 8; default -> 0;
            };
            context.setVariable("msiFeePct", feePct);
            BigDecimal feeRate = BigDecimal.valueOf(feePct).movePointLeft(2);
            BigDecimal originalTotal = event.total().divide(BigDecimal.ONE.add(feeRate), 2, RoundingMode.HALF_UP);
            context.setVariable("originalTotal", originalTotal);
            context.setVariable("msiFeeAmount", event.total().subtract(originalTotal));
        }

        String htmlContent = templateEngine.process("emails/order-received", context);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String subject = messageSource.getMessage("mail.received.subject",
                new Object[]{ event.orderId() }, locale);
            helper.setFrom(sender);
            helper.setTo(event.email());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("sent order-received email for order #{} to {}", event.orderId(), event.email());
        } catch (MessagingException e) {
            log.error("failed to send order-received email for order #{} to {}", event.orderId(), event.email(), e);
        }
    }

    @Async("emailTaskExecutor")
    @EventListener
    public void handleOrderShipped(OrderShippedEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());

        Context context = new Context(locale);
        context.setVariable("firstName", event.firstName());
        context.setVariable("orderId", event.orderId());
        context.setVariable("items", event.items());
        context.setVariable("trackingNumber", event.trackingNumber());
        context.setVariable("hasTracking", event.trackingNumber() != null);

        String htmlContent = templateEngine.process("emails/order-shipped", context);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String subject = messageSource.getMessage("mail.shipped.subject",
                new Object[]{ event.orderId() }, locale);
            helper.setFrom(sender);
            helper.setTo(event.email());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("sent order-shipped email for order #{} to {}", event.orderId(), event.email());
        } catch (MessagingException e) {
            log.error("failed to send order-shipped email for order #{} to {}", event.orderId(), event.email(), e);
        }
    }

    @Async("emailTaskExecutor")
    @EventListener
    public void handlePasswordChanged(PasswordChangedEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());

        Context context = new Context(locale);
        context.setVariable("firstName", event.firstName());

        String htmlContent = templateEngine.process("emails/password-changed", context);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String subject = messageSource.getMessage("mail.password.subject", null, locale);
            helper.setFrom(sender);
            helper.setTo(event.email());
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("sent password-changed email to {}", event.email());
        } catch (MessagingException e) {
            log.error("failed to send password-changed email to {}", event.email(), e);
        }
    }

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
