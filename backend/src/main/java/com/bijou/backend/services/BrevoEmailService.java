package com.bijou.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
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
import org.springframework.core.ParameterizedTypeReference;
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
            restTemplate.exchange(BREVO_API_URL, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
            log.info("email sent to {} via Brevo", to);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 429) {
                appSettingsService.autoDisable("RATE_LIMIT_EXCEEDED");
            } else {
                log.error("Brevo API error sending to {} — HTTP {}: {}", to, e.getStatusCode().value(), e.getResponseBodyAsString());
            }
        } catch (Exception e) {
            log.error("unexpected error sending email to {}: {}", to, e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    public BrevoQuotaView fetchDailyQuota() {
        String today = LocalDate.now().toString();
        String url = "https://api.brevo.com/v3/smtp/statistics/reports?startDate=" + today + "&endDate=" + today;

        HttpHeaders headers = new HttpHeaders();
        headers.set("api-key", apiKey);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(headers), new ParameterizedTypeReference<Map<String, Object>>() {});
            List<Map<String, Object>> reports = (List<Map<String, Object>>) response.getBody().get("reports");
            int sentToday = 0;
            if (reports != null && !reports.isEmpty()) {
                sentToday = ((Number) reports.get(0).getOrDefault("requests", 0)).intValue();
            }
            return new BrevoQuotaView(sentToday, Math.max(0, 300 - sentToday), 300);
        } catch (Exception e) {
            log.error("failed to fetch Brevo daily quota: {}", e.getMessage());
            return null;
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
        ctx.setVariable("isBankTransfer", event.bankTransfer());
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
        ctx.setVariable("isBankTransfer", event.bankTransfer());
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
    public void handleBankTransferInstructions(BankTransferInstructionsEvent event) {
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
        ctx.setVariable("clabe", event.clabe());
        ctx.setVariable("bankName", event.bankName());
        ctx.setVariable("reference", event.reference());
        ctx.setVariable("hostedInstructionsUrl", event.hostedInstructionsUrl());
        BigDecimal dutyAmt     = event.dutyAmount()  != null ? event.dutyAmount()  : BigDecimal.ZERO;
        BigDecimal taxAmt      = event.taxAmount()   != null ? event.taxAmount()   : BigDecimal.ZERO;
        BigDecimal handlingAmt = event.handlingFee() != null ? event.handlingFee() : BigDecimal.ZERO;
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

        String subject = messageSource.getMessage("mail.banktransfer.subject", new Object[]{ event.orderId() }, locale);
        send(event.email(), subject, templateEngine.process("emails/bank-transfer", ctx));
        log.info("sent bank-transfer instructions email for order #{} to {}", event.orderId(), event.email());
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
    public void handleFacturaEmail(FacturaEmailEvent event) {
        Locale locale = Locale.forLanguageTag(event.language().name().toLowerCase());
        Context ctx = new Context(locale);
        ctx.setVariable("firstName", event.firstName());
        ctx.setVariable("orderId", event.orderId());
        ctx.setVariable("facturaUrl", event.facturaUrl());

        String subject = messageSource.getMessage("mail.factura.subject", new Object[]{ event.orderId() }, locale);
        send(event.email(), subject, templateEngine.process("emails/factura", ctx));
        log.info("sent factura email for order #{} to {}", event.orderId(), event.email());
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
