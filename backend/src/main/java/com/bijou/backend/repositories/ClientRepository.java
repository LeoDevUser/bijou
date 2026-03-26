package com.bijou.backend.repositories;
import com.bijou.backend.entities.Client;
import com.bijou.backend.entities.Role;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    Optional<Client> findByEmail(String email);
    List<Client> findAllByRole(Role role);
}
