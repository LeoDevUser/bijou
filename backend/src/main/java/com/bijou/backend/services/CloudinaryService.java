package com.bijou.backend.services;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private Set<String> allowedImageTypes = new HashSet<>(List.of("png", "jpeg","webp"));

    public CloudinaryResponse upload(MultipartFile file) {
        if (file.isEmpty()) {
            log.warn("attempted to upload an empty file");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "attempted to upload an empty file");
        }

        if(!allowedImageTypes.contains(file.getContentType())) {
            log.warn("formats accepted 'png', 'jpeg', 'webp'");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "wrong image format");
        }

        try {
            Map<?,?> res = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            return new CloudinaryResponse(
                (String) res.get("public_id"),
                (String) res.get("secure_url"),
                (String) res.get("format"),
                ((Number) res.get("bytes")).longValue()
            );

        } catch (IOException e){
            log.error("error uploading the item image: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "error uploading image");
        }
    }

    public void delete(String imageId) {
        try {
            cloudinary.uploader().destroy(imageId, ObjectUtils.emptyMap());
        } catch (IOException e){
            log.error("error deleting image: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "error uploading image");
        }
    }
}
