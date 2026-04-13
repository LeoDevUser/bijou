package com.bijou.backend.services;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.bijou.backend.exception.AppException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private static final Set<String> ALLOWED_IMAGE_TYPES = new HashSet<>(List.of("image/png", "image/jpeg", "image/webp"));
    private static final Set<String> ALLOWED_VIDEO_TYPES = new HashSet<>(List.of("video/mp4", "video/webm", "video/quicktime"));
    private static final long MAX_VIDEO_BYTES = 50L * 1024 * 1024;
    private static final long MAX_PDF_BYTES = 10L * 1024 * 1024;

    public CloudinaryResponse upload(MultipartFile file) {
        if (file.isEmpty()) {
            log.warn("attempted to upload an empty file");
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_EMPTY");
        }

        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            log.warn("formats accepted 'png', 'jpeg', 'webp'");
            throw new AppException(HttpStatus.BAD_REQUEST, "IMAGE_FORMAT_INVALID");
        }

        try {
            Map<?,?> res = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            log.info("uploaded new image");
            return new CloudinaryResponse(
                (String) res.get("public_id"),
                (String) res.get("secure_url"),
                (String) res.get("format"),
                ((Number) res.get("bytes")).longValue()
            );

        } catch (IOException e){
            log.error("error uploading the item image: {}", e.getMessage());
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "IMAGE_UPLOAD_FAILED");
        }
    }

    public CloudinaryResponse uploadVideo(MultipartFile file) {
        if (file.isEmpty()) {
            log.warn("attempted to upload an empty file");
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_EMPTY");
        }

        if (!ALLOWED_VIDEO_TYPES.contains(file.getContentType())) {
            log.warn("video formats accepted: 'mp4', 'webm', 'quicktime'");
            throw new AppException(HttpStatus.BAD_REQUEST, "VIDEO_FORMAT_INVALID");
        }

        if (file.getSize() > MAX_VIDEO_BYTES) {
            log.warn("video exceeds 50MB limit");
            throw new AppException(HttpStatus.BAD_REQUEST, "VIDEO_TOO_LARGE");
        }

        try {
            Map<?,?> res = cloudinary.uploader().upload(file.getBytes(),
                ObjectUtils.asMap("resource_type", "video"));
            log.info("uploaded new video");
            return new CloudinaryResponse(
                (String) res.get("public_id"),
                (String) res.get("secure_url"),
                (String) res.get("format"),
                ((Number) res.get("bytes")).longValue()
            );
        } catch (IOException e) {
            log.error("error uploading video: {}", e.getMessage());
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "VIDEO_UPLOAD_FAILED");
        }
    }

    public CloudinaryResponse uploadPdf(MultipartFile file) {
        if (file.isEmpty()) {
            log.warn("attempted to upload an empty file");
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_EMPTY");
        }

        if (!"application/pdf".equals(file.getContentType())) {
            log.warn("only PDF files are accepted for factura upload");
            throw new AppException(HttpStatus.BAD_REQUEST, "PDF_FORMAT_INVALID");
        }

        if (file.getSize() > MAX_PDF_BYTES) {
            log.warn("PDF exceeds 10MB limit");
            throw new AppException(HttpStatus.BAD_REQUEST, "PDF_TOO_LARGE");
        }

        try {
            Map<?,?> res = cloudinary.uploader().upload(file.getBytes(),
                ObjectUtils.asMap("resource_type", "raw", "format", "pdf"));
            log.info("uploaded factura PDF");
            return new CloudinaryResponse(
                (String) res.get("public_id"),
                (String) res.get("secure_url"),
                "pdf",
                ((Number) res.get("bytes")).longValue()
            );
        } catch (IOException e) {
            log.error("error uploading factura PDF: {}", e.getMessage());
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "PDF_UPLOAD_FAILED");
        }
    }

    public void delete(String imageId) {
        delete(imageId, "image");
    }

    public CloudinaryResourcesPage listResources(String resourceType, String nextCursor) {
        try {
            Map<String, Object> params = new java.util.LinkedHashMap<>();
            params.put("resource_type", resourceType);
            params.put("max_results", 30);
            if (nextCursor != null && !nextCursor.isBlank()) {
                params.put("next_cursor", nextCursor);
            }
            Map<?, ?> result = cloudinary.api().resources(params);
            Object rawList = result.get("resources");
            List<?> rawResources = rawList instanceof List<?> l ? l : List.of();
            List<CloudinaryResourceView> resources = new ArrayList<>();
            for (Object raw : rawResources) {
                Map<?, ?> r = (Map<?, ?>) raw;
                resources.add(new CloudinaryResourceView(
                        (String) r.get("public_id"),
                        (String) r.get("resource_type"),
                        (String) r.get("format"),
                        r.get("bytes") instanceof Number n ? n.longValue() : 0L,
                        (String) r.get("created_at"),
                        (String) r.get("secure_url")));
            }
            String cursor = (String) result.get("next_cursor");
            log.info("listed {} {} resources", resources.size(), resourceType);
            return new CloudinaryResourcesPage(resources, cursor);
        } catch (Exception e) {
            log.error("error listing cloudinary resources: {}", e.getMessage());
            throw new AppException(org.springframework.http.HttpStatus.UNPROCESSABLE_CONTENT, "CLOUDINARY_LIST_FAILED");
        }
    }

    public void delete(String imageId, String resourceType) {
        try {
            cloudinary.uploader().destroy(imageId, ObjectUtils.asMap("resource_type", resourceType));
            log.info("deleted {} '{}'", resourceType, imageId);
        } catch (IOException e) {
            log.error("error deleting {}: {}", resourceType, e.getMessage());
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "MEDIA_DELETE_FAILED");
        }
    }
}
