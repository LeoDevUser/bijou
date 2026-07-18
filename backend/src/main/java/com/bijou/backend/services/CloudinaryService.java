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

import com.bijou.backend.entities.MediaAssetName;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.MediaAssetNameRepository;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private final MediaAssetNameRepository mediaAssetNameRepository;
    private static final Set<String> ALLOWED_IMAGE_TYPES = new HashSet<>(List.of("image/png", "image/jpeg", "image/webp"));
    private static final Set<String> ALLOWED_VIDEO_TYPES = new HashSet<>(List.of("video/mp4", "video/webm", "video/quicktime"));
    private static final long MAX_VIDEO_BYTES = 50L * 1024 * 1024;
    private static final long MAX_PDF_BYTES = 10L * 1024 * 1024;

    /**
     * Admin-provided display name → Cloudinary public_id. Slugified so it is
     * URL-safe. The slug is used as-is when free; a short random suffix is
     * appended only when that public_id is already taken (Cloudinary silently
     * OVERWRITES an existing asset on public_id collision, which would break
     * every stored URL pointing at the old one).
     */
    private String toPublicId(String name, String resourceType) {
        String slug = java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        if (slug.length() > 60) slug = slug.substring(0, 60);
        if (slug.isBlank() || isPublicIdTaken(slug, resourceType)) {
            String suffix = java.util.UUID.randomUUID().toString().substring(0, 6);
            return slug.isBlank() ? suffix : slug + "-" + suffix;
        }
        return slug;
    }

    private boolean isPublicIdTaken(String publicId, String resourceType) {
        try {
            cloudinary.api().resource(publicId,
                ObjectUtils.asMap("resource_type", resourceType != null ? resourceType : "image"));
            return true;
        } catch (com.cloudinary.api.exceptions.NotFound e) {
            return false;
        } catch (Exception e) {
            // Can't verify (network/rate limit) — suffix to be safe, an
            // unverified bare slug could overwrite an existing asset.
            log.warn("could not check public_id '{}', suffixing: {}", publicId, e.getMessage());
            return true;
        }
    }

    private Map<String, Object> uploadOptions(String name, String resourceType) {
        Map<String, Object> options = new java.util.LinkedHashMap<>();
        if (resourceType != null) options.put("resource_type", resourceType);
        if (name != null && !name.isBlank()) options.put("public_id", toPublicId(name, resourceType));
        return options;
    }

    /** Upsert the display name stored in our DB for a Cloudinary asset. */
    public void setDisplayName(String publicId, String resourceType, String name) {
        if (name == null || name.isBlank()) return;
        MediaAssetName row = mediaAssetNameRepository
                .findByPublicIdAndResourceType(publicId, resourceType)
                .orElseGet(() -> MediaAssetName.builder()
                        .publicId(publicId)
                        .resourceType(resourceType)
                        .build());
        row.setDisplayName(name.trim());
        mediaAssetNameRepository.save(row);
        log.info("set display name for {} '{}'", resourceType, publicId);
    }

    public CloudinaryResponse upload(MultipartFile file) {
        return upload(file, null);
    }

    public CloudinaryResponse upload(MultipartFile file, String name) {
        if (file.isEmpty()) {
            log.warn("attempted to upload an empty file");
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_EMPTY");
        }

        if (!ALLOWED_IMAGE_TYPES.contains(file.getContentType())) {
            log.warn("formats accepted 'png', 'jpeg', 'webp'");
            throw new AppException(HttpStatus.BAD_REQUEST, "IMAGE_FORMAT_INVALID");
        }

        try {
            Map<?,?> res = cloudinary.uploader().upload(file.getBytes(), uploadOptions(name, null));
            log.info("uploaded new image");
            setDisplayName((String) res.get("public_id"), "image", name);
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
        return uploadVideo(file, null);
    }

    public CloudinaryResponse uploadVideo(MultipartFile file, String name) {
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
            Map<?,?> res = cloudinary.uploader().upload(file.getBytes(), uploadOptions(name, "video"));
            log.info("uploaded new video");
            setDisplayName((String) res.get("public_id"), "video", name);
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
            List<String> publicIds = rawResources.stream()
                    .map(raw -> (String) ((Map<?, ?>) raw).get("public_id"))
                    .toList();
            Map<String, String> displayNames = new java.util.HashMap<>();
            for (MediaAssetName n : mediaAssetNameRepository.findByResourceTypeAndPublicIdIn(resourceType, publicIds)) {
                displayNames.put(n.getPublicId(), n.getDisplayName());
            }
            List<CloudinaryResourceView> resources = new ArrayList<>();
            for (Object raw : rawResources) {
                Map<?, ?> r = (Map<?, ?>) raw;
                String publicId = (String) r.get("public_id");
                resources.add(new CloudinaryResourceView(
                        publicId,
                        (String) r.get("resource_type"),
                        (String) r.get("format"),
                        r.get("bytes") instanceof Number n ? n.longValue() : 0L,
                        (String) r.get("created_at"),
                        (String) r.get("secure_url"),
                        displayNames.get(publicId)));
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
            mediaAssetNameRepository.findByPublicIdAndResourceType(imageId, resourceType)
                    .ifPresent(mediaAssetNameRepository::delete);
            log.info("deleted {} '{}'", resourceType, imageId);
        } catch (IOException e) {
            log.error("error deleting {}: {}", resourceType, e.getMessage());
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "MEDIA_DELETE_FAILED");
        }
    }
}
