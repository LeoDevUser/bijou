package com.bijou.backend.services;

import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.transaction.Transactional;

import com.bijou.backend.entities.Collection;
import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CollectionRepository;
import com.bijou.backend.repositories.LabelRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final LabelRepository labelRepository;
    private final CloudinaryService cloudinaryService;

    private static final Set<String> VIDEO_TYPES = Set.of("video/mp4", "video/webm", "video/quicktime");

    private CollectionView toView(Collection c) {
        Label label = c.getLabel();
        return new CollectionView(
                c.getId(),
                label != null ? label.getId() : null,
                label != null ? label.getNameEn() : null,
                label != null ? label.getNameFr() : null,
                label != null ? label.getNameEs() : null,
                c.getImageUrl(), c.getImageId(), c.getResourceType(),
                c.getHeaderEn(), c.getHeaderFr(), c.getHeaderEs(),
                c.getSubheaderEn(), c.getSubheaderFr(), c.getSubheaderEs(),
                c.getColor());
    }

    public List<CollectionView> getAll() {
        return collectionRepository.findAllByOrderByIdAsc().stream().map(this::toView).toList();
    }

    public CollectionView create(CollectionRequest req) {
        Label label = findLabelOrThrow(req.labelId());
        Collection collection = Collection.builder()
                .label(label)
                .headerEn(req.headerEn())
                .headerFr(req.headerFr())
                .headerEs(req.headerEs())
                .subheaderEn(req.subheaderEn())
                .subheaderFr(req.subheaderFr())
                .subheaderEs(req.subheaderEs())
                .color(req.color())
                .build();
        return toView(collectionRepository.save(collection));
    }

    public CollectionView updateText(Long id, CollectionRequest req) {
        Collection collection = findOrThrow(id);
        if (req.labelId() != null) {
            collection.setLabel(findLabelOrThrow(req.labelId()));
        }
        collection.setHeaderEn(req.headerEn());
        collection.setHeaderFr(req.headerFr());
        collection.setHeaderEs(req.headerEs());
        collection.setSubheaderEn(req.subheaderEn());
        collection.setSubheaderFr(req.subheaderFr());
        collection.setSubheaderEs(req.subheaderEs());
        collection.setColor(req.color());
        return toView(collectionRepository.save(collection));
    }

    @Transactional
    public CollectionView uploadMedia(Long id, MultipartFile file) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        boolean isVideo = VIDEO_TYPES.contains(file.getContentType());
        CloudinaryResponse res = isVideo ? cloudinaryService.uploadVideo(file) : cloudinaryService.upload(file);
        collection.setImageUrl(res.url());
        collection.setImageId(res.imageId());
        collection.setResourceType(isVideo ? "video" : "image");
        CollectionView view = toView(collectionRepository.saveAndFlush(collection));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("uploaded {} for collection #{}", collection.getResourceType(), id);
        return view;
    }

    @Transactional
    public CollectionView deleteMedia(Long id) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        collection.setImageUrl(null);
        collection.setImageId(null);
        collection.setResourceType("image");
        CollectionView view = toView(collectionRepository.saveAndFlush(collection));
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("deleted media for collection #{}", id);
        return view;
    }

    @Transactional
    public void delete(Long id) {
        Collection collection = findOrThrow(id);
        String oldImageId = collection.getImageId();
        String oldResourceType = collection.getResourceType();
        collectionRepository.delete(collection);
        collectionRepository.flush();
        if (oldImageId != null && !oldImageId.isEmpty()) {
            cloudinaryService.delete(oldImageId, oldResourceType);
        }
        log.info("deleted collection #{}", id);
    }

    private Collection findOrThrow(Long id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "COLLECTION_NOT_FOUND"));
    }

    private Label findLabelOrThrow(Long labelId) {
        return labelRepository.findById(labelId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "LABEL_NOT_FOUND"));
    }
}
