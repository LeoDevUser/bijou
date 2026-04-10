package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import com.bijou.backend.auth.RegisterEvent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class BrevoEmailService {

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final RestTemplate restTemplate;
    private final TemplateEngine templateEngine;
    private final MessageSource messageSource;
    private final AppSettingsService appSettingsService;
    private final JavaMailSender javaMailSender;

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${spring.mail.sender}")
    private String senderEmail;

    // ── Core send ─────────────────────────────────────────────────────────────

    private void send(String to, String subject, String htmlContent) {
        if (appSettingsService.isRelayEnabled()) {
            sendViaBrevo(to, subject, htmlContent);
        } else {
            sendViaSmtp(to, subject, htmlContent);
        }
    }

    private void sendViaBrevo(String to, String subject, String htmlContent) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        Map<String, Object> body = Map.of(
            "sender", Map.of("email", senderEmail),
            "to", List.of(Map.of("email", to)),
            "subject", subject,
            "htmlContent", htmlContent
        );

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                BREVO_API_URL,
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
            );

            int remaining = parseHeader(response.getHeaders(), "x-sib-ratelimit-remaining", Integer.MAX_VALUE);
            long resetEpoch = parseHeader(response.getHeaders(), "x-sib-ratelimit-reset", 0L);
            appSettingsService.recordSent(remaining, resetEpoch);
            log.info("email sent to {} via Brevo (remaining quota: {})", to, remaining);

        } catch (HttpClientErrorException e) {
            HttpHeaders respHeaders = e.getResponseHeaders();
            int remaining = respHeaders != null
                ? parseHeader(respHeaders, "x-sib-ratelimit-remaining", -1) : -1;
            long resetEpoch = respHeaders != null
                ? parseHeader(respHeaders, "x-sib-ratelimit-reset", 0L) : 0L;

            if (e.getStatusCode().value() == 429) {
                appSettingsService.autoDisable("RATE_LIMIT_EXCEEDED", remaining, resetEpoch);
            } else {
                log.error("Brevo API error sending to {} — HTTP {}: {}", to, e.getStatusCode().value(), e.getResponseBodyAsString());
            }
        } catch (Exception e) {
            log.error("unexpected error sending email to {}: {}", to, e.getMessage(), e);
        }
    }

    private void sendViaSmtp(String to, String subject, String htmlContent) {
        try {
            javaMailSender.send(message -> {
                MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
                helper.setFrom(senderEmail);
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
            });
            log.info("email sent to {} via direct SMTP (relay disabled — may land in spam)", to);
        } catch (Exception e) {
            log.error("direct SMTP send failed for {}: {}", to, e.getMessage(), e);
        }
    }

    private int parseHeader(HttpHeaders headers, String name, int fallback) {
        List<String> values = headers.get(name);
        if (values == null || values.isEmpty()) return fallback;
        try { return Integer.parseInt(values.get(0).trim()); } catch (NumberFormatException e) { return fallback; }
    }

    private long parseHeader(HttpHeaders headers, String name, long fallback) {
        List<String> values = headers.get(name);
        if (values == null || values.isEmpty()) return fallback;
        try { return Long.parseLong(values.get(0).trim()); } catch (NumberFormatException e) { return fallback; }
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    @Async("emailTaskExecutor")
    @EventListener
    public void handleOrderConfirmation(OrderConfirmationEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());
        Context ctx = new Context(locale);
        ctx.setVariable("firstName", event.firstName());
        ctx.setVariable("orderId", event.orderId());
        ctx.setVariable("items", event.items());
        ctx.setVariable("total", event.total());
        ctx.setVariable("address", event.addressLine1());
        ctx.setVariable("city", event.city());
        ctx.setVariable("postalCode", event.postalCode());
        ctx.setVariable("country", event.country());
        ctx.setVariable("oxxoVoucherUrl", event.oxxoVoucherUrl());
        ctx.setVariable("isOxxo", event.oxxoVoucherUrl() != null);
        ctx.setVariable("oxxoPayment", event.oxxoPayment());
        ctx.setVariable("installments", event.installments());
        ctx.setVariable("hasMsi", event.installments() != null);
        BigDecimal dutyAmt     = event.dutyAmount()   != null ? event.dutyAmount()   : BigDecimal.ZERO;
        BigDecimal taxAmt      = event.taxAmount()    != null ? event.taxAmount()    : BigDecimal.ZERO;
        BigDecimal handlingAmt = event.handlingFee()  != null ? event.handlingFee()  : BigDecimal.ZERO;
        BigDecimal itemsSubtotal = event.items().stream()
            .map(i -> i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
        ctx.setVariable("itemsSubtotal", itemsSubtotal);
        ctx.setVariable("dutyAmount", dutyAmt);
        ctx.setVariable("taxAmount", taxAmt);
        ctx.setVariable("handlingFee", handlingAmt);
        ctx.setVariable("hasDuty", dutyAmt.compareTo(BigDecimal.ZERO) > 0);
        ctx.setVariable("hasTax", taxAmt.compareTo(BigDecimal.ZERO) > 0);
        ctx.setVariable("hasHandlingFee", handlingAmt.compareTo(BigDecimal.ZERO) > 0);
        ctx.setVariable("hasTaxBreakdown", dutyAmt.add(taxAmt).add(handlingAmt).compareTo(BigDecimal.ZERO) > 0);
        if (event.installments() != null) {
            BigDecimal monthly = event.total().divide(BigDecimal.valueOf(event.installments()), 2, RoundingMode.HALF_UP);
            ctx.setVariable("monthlyPayment", monthly);
            int feePct = switch (event.installments()) {
                case 3 -> 2; case 6 -> 4; case 9 -> 6; case 12 -> 8; default -> 0;
            };
            ctx.setVariable("msiFeePct", feePct);
            BigDecimal feeRate = BigDecimal.valueOf(feePct).movePointLeft(2);
            BigDecimal originalTotal = event.total().divide(BigDecimal.ONE.add(feeRate), 2, RoundingMode.HALF_UP);
            ctx.setVariable("originalTotal", originalTotal);
            ctx.setVariable("msiFeeAmount", event.total().subtract(originalTotal));
        }

        boolean isOxxo = event.oxxoVoucherUrl() != null;
        log.info("sending {} email for order #{} to {}",
            isOxxo ? "order-placed (OXXO)" : "payment-confirmed", event.orderId(), event.email());

        String subject = messageSource.getMessage("mail.order.subject", new Object[]{ event.orderId() }, locale);
        send(event.email(), subject, templateEngine.process("emails/order-confirmation", ctx));
    }

    @Async("emailTaskExecutor")
    @EventListener
    public void handleOrderReceived(OrderReceivedEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());
        Context ctx = new Context(locale);
        ctx.setVariable("firstName", event.firstName());
        ctx.setVariable("orderId", event.orderId());
        ctx.setVariable("items", event.items());
        ctx.setVariable("total", event.total());
        ctx.setVariable("address", event.addressLine1());
        ctx.setVariable("city", event.city());
        ctx.setVariable("postalCode", event.postalCode());
        ctx.setVariable("country", event.country());
        ctx.setVariable("installments", event.installments());
        ctx.setVariable("hasMsi", event.installments() != null);
        BigDecimal dutyAmt     = event.dutyAmount()   != null ? event.dutyAmount()   : BigDecimal.ZERO;
        BigDecimal taxAmt      = event.taxAmount()    != null ? event.taxAmount()    : BigDecimal.ZERO;
        BigDecimal handlingAmt = event.handlingFee()  != null ? event.handlingFee()  : BigDecimal.ZERO;
        BigDecimal itemsSubtotal = event.items().stream()
            .map(i -> i.unitPrice().multiply(BigDecimal.valueOf(i.quantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
        ctx.setVariable("itemsSubtotal", itemsSubtotal);
        ctx.setVariable("dutyAmount", dutyAmt);
        ctx.setVariable("taxAmount", taxAmt);
        ctx.setVariable("handlingFee", handlingAmt);
        ctx.setVariable("hasDuty", dutyAmt.compareTo(BigDecimal.ZERO) > 0);
        ctx.setVariable("hasTax", taxAmt.compareTo(BigDecimal.ZERO) > 0);
        ctx.setVariable("hasHandlingFee", handlingAmt.compareTo(BigDecimal.ZERO) > 0);
        ctx.setVariable("hasTaxBreakdown", dutyAmt.add(taxAmt).add(handlingAmt).compareTo(BigDecimal.ZERO) > 0);
        if (event.installments() != null) {
            BigDecimal monthly = event.total().divide(BigDecimal.valueOf(event.installments()), 2, RoundingMode.HALF_UP);
            ctx.setVariable("monthlyPayment", monthly);
            int feePct = switch (event.installments()) {
                case 3 -> 2; case 6 -> 4; case 9 -> 6; case 12 -> 8; default -> 0;
            };
            ctx.setVariable("msiFeePct", feePct);
            BigDecimal feeRate = BigDecimal.valueOf(feePct).movePointLeft(2);
            BigDecimal originalTotal = event.total().divide(BigDecimal.ONE.add(feeRate), 2, RoundingMode.HALF_UP);
            ctx.setVariable("originalTotal", originalTotal);
            ctx.setVariable("msiFeeAmount", event.total().subtract(originalTotal));
        }

        String subject = messageSource.getMessage("mail.received.subject", new Object[]{ event.orderId() }, locale);
        send(event.email(), subject, templateEngine.process("emails/order-received", ctx));
        log.info("sent order-received email for order #{} to {}", event.orderId(), event.email());
    }

    @Async("emailTaskExecutor")
    @EventListener
    public void handleOrderShipped(OrderShippedEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());
        Context ctx = new Context(locale);
        ctx.setVariable("firstName", event.firstName());
        ctx.setVariable("orderId", event.orderId());
        ctx.setVariable("items", event.items());
        ctx.setVariable("trackingNumber", event.trackingNumber());
        ctx.setVariable("hasTracking", event.trackingNumber() != null);

        String subject = messageSource.getMessage("mail.shipped.subject", new Object[]{ event.orderId() }, locale);
        send(event.email(), subject, templateEngine.process("emails/order-shipped", ctx));
        log.info("sent order-shipped email for order #{} to {}", event.orderId(), event.email());
    }

    @Async("emailTaskExecutor")
    @EventListener
    public void handlePasswordChanged(PasswordChangedEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());
        Context ctx = new Context(locale);
        ctx.setVariable("firstName", event.firstName());
        ctx.setVariable("email", event.email());

        String subject = messageSource.getMessage("mail.password.subject", null, locale);
        send(event.email(), subject, templateEngine.process("emails/password-changed", ctx));
        log.info("sent password-changed email to {}", event.email());
    }

    @Async("emailTaskExecutor")
    @EventListener
    public void handleRegistration(RegisterEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());
        Context ctx = new Context(locale);
        ctx.setVariable("fullName", event.firstName() + " " + event.lastName());

        String subject = messageSource.getMessage("mail.welcome.subject", null, locale);
        send(event.email(), subject, templateEngine.process("emails/welcome", ctx));
        log.info("sent {} registration email to {}", event.language(), event.email());
    }
}
