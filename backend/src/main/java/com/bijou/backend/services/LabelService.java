package com.bijou.backend.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.CollectionRepository;
import com.bijou.backend.repositories.ItemRepository;
import com.bijou.backend.repositories.LabelRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class LabelService {

    private final LabelRepository labelRepository;
    private final ItemRepository itemRepository;
    private final CollectionRepository collectionRepository;

    public static LabelView toView(Label l) {
        return new LabelView(l.getId(), l.getNameEn(), l.getNameFr(), l.getNameEs());
    }

    public List<LabelView> getAll() {
        return labelRepository.findAll().stream().map(LabelService::toView).toList();
    }

    public LabelView create(LabelRequest req) {
        Label label = labelRepository.save(
            Label.builder()
                .nameEn(req.nameEn())
                .nameFr(req.nameFr())
                .nameEs(req.nameEs())
                .build()
        );
        log.info("created label #{} ({})", label.getId(), label.getNameEn());
        return toView(label);
    }

    @Transactional
    public void delete(Long id) {
        Label label = labelRepository.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "LABEL_NOT_FOUND"));
        // Atomic native DELETEs on the junction tables — avoids the in-memory
        // collection mutation pattern which could miss items assigned concurrently.
        itemRepository.detachLabel(id);
        collectionRepository.detachLabel(id);
        labelRepository.deleteById(id);
        log.info("deleted label #{} ({})", id, label.getNameEn());
    }
}
