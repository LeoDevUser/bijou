package com.bijou.backend.services;

import java.io.IOException;
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
    private Set<String> allowedImageTypes = new HashSet<>(List.of("image/png", "image/jpeg","image/webp"));

    public CloudinaryResponse upload(MultipartFile file) {
        if (file.isEmpty()) {
            log.warn("attempted to upload an empty file");
            throw new AppException(HttpStatus.BAD_REQUEST, "FILE_EMPTY");
        }

        if(!allowedImageTypes.contains(file.getContentType())) {
            log.warn("formats accepted 'png', 'jpeg', 'webp'");
            throw new AppException(HttpStatus.BAD_REQUEST, "IMAGE_FORMAT_INVALID");
        }

        try {
            Map<?,?> res = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            log.info("uploaded new item image");
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

    public void delete(String imageId) {
        try {
            cloudinary.uploader().destroy(imageId, ObjectUtils.emptyMap());
            log.info("deleted item image");
        } catch (IOException e){
            log.error("error deleting image: {}", e.getMessage());
            throw new AppException(HttpStatus.UNPROCESSABLE_CONTENT, "IMAGE_DELETE_FAILED");
        }
    }
}
