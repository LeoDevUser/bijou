package com.bijou.backend.services;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.bijou.backend.entities.Announcement;
import com.bijou.backend.exception.AppException;
import com.bijou.backend.repositories.AnnouncementRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    private AnnouncementView toView(Announcement a) {
        return new AnnouncementView(a.getId(), a.getTextEn(), a.getTextFr(), a.getTextEs(), a.isActive(), a.getSortOrder());
    }

    public List<AnnouncementView> getActive() {
        return announcementRepository.findByActiveTrueOrderBySortOrderAsc()
            .stream().map(this::toView).toList();
    }

    public List<AnnouncementView> getAll() {
        return announcementRepository.findAllByOrderBySortOrderAsc()
            .stream().map(this::toView).toList();
    }

    @Transactional
    public AnnouncementView create(AnnouncementRequest req) {
        int nextOrder = (int) announcementRepository.count();
        Announcement a = announcementRepository.save(Announcement.builder()
            .textEn(req.textEn())
            .textFr(req.textFr())
            .textEs(req.textEs())
            .active(req.active())
            .sortOrder(nextOrder)
            .build());
        return toView(a);
    }

    @Transactional
    public AnnouncementView update(Long id, AnnouncementRequest req) {
        Announcement a = findOrThrow(id);
        a.setTextEn(req.textEn());
        a.setTextFr(req.textFr());
        a.setTextEs(req.textEs());
        a.setActive(req.active());
        return toView(announcementRepository.save(a));
    }

    @Transactional
    public void delete(Long id) {
        if (!announcementRepository.existsById(id)) {
            throw new AppException(HttpStatus.NOT_FOUND, "ANNOUNCEMENT_NOT_FOUND");
        }
        announcementRepository.deleteById(id);
    }

    @Transactional
    public List<AnnouncementView> moveUp(Long id) {
        List<Announcement> all = announcementRepository.findAllByOrderBySortOrderAsc();
        int idx = indexOfId(all, id);
        if (idx > 0) swap(all, idx, idx - 1);
        return announcementRepository.saveAll(all).stream().map(this::toView).toList();
    }

    @Transactional
    public List<AnnouncementView> moveDown(Long id) {
        List<Announcement> all = announcementRepository.findAllByOrderBySortOrderAsc();
        int idx = indexOfId(all, id);
        if (idx < all.size() - 1) swap(all, idx, idx + 1);
        return announcementRepository.saveAll(all).stream().map(this::toView).toList();
    }

    private void swap(List<Announcement> list, int i, int j) {
        int tmp = list.get(i).getSortOrder();
        list.get(i).setSortOrder(list.get(j).getSortOrder());
        list.get(j).setSortOrder(tmp);
    }

    private int indexOfId(List<Announcement> list, Long id) {
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).getId().equals(id)) return i;
        }
        return -1;
    }

    private Announcement findOrThrow(Long id) {
        return announcementRepository.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "ANNOUNCEMENT_NOT_FOUND"));
    }
}
