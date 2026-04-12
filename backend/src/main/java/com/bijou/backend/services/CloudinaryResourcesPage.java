package com.bijou.backend.services;

import java.util.List;

public record CloudinaryResourcesPage(
        List<CloudinaryResourceView> resources,
        String nextCursor) {
}
