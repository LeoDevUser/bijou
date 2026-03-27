package com.bijou.backend.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Label;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.LabelRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LabelService {

    private final LabelRepository labelRepository;

    public List<LabelView> getAll() {
        return labelRepository.findAll().stream()
            .map(l -> new LabelView(l.getId(), l.getName()))
            .toList();
    }

    public LabelView create(String name) {
        if (labelRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(HttpStatus.CONFLICT, "LABEL_NAME_CONFLICT", name);
        }
        Label label = labelRepository.save(Label.builder().name(name).build());
        return new LabelView(label.getId(), label.getName());
    }

    public void delete(Long id) {
        if (!labelRepository.existsById(id)) {
            throw new AppException(HttpStatus.NOT_FOUND, "LABEL_NOT_FOUND");
        }
        labelRepository.deleteById(id);
    }
}
