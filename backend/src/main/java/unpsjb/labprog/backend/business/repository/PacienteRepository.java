package unpsjb.labprog.backend.business.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.Paciente;

@Repository
public interface PacienteRepository extends JpaRepository<Paciente, Integer> {
    boolean existsByDni(Long dni);
    boolean existsByEmail(String email);
    Optional<Paciente> findByDni(Long dni);
    Optional<Paciente> findByEmail(String email);
    
    /**
     * Busca un paciente por email del usuario
     * Nota: Paciente no tiene relación directa con User, se relacionan por email
     * @param email Email del usuario
     * @return Optional con el paciente si existe
     */
    @Query("SELECT p FROM Paciente p WHERE LOWER(p.email) = LOWER(:email)")
    Optional<Paciente> findByUserEmail(@Param("email") String email);

    /**
     * Método para búsqueda paginada con filtros combinados y ordenamiento dinámico
     * @param nombreApellido Filtro unificado para nombre O apellido (LIKE, opcional)
     * @param documento Filtro por DNI (LIKE, opcional)
     * @param email Filtro por email (LIKE, opcional)
     * @param pageable Configuración de paginación y ordenamiento
     * @return Página de pacientes filtrados y ordenados
     */
    @Query("""
        SELECT p FROM Paciente p
        WHERE (:nombreApellido IS NULL OR
               LOWER(p.nombre) LIKE LOWER(CONCAT('%', :nombreApellido, '%')) OR
               LOWER(p.apellido) LIKE LOWER(CONCAT('%', :nombreApellido, '%')))
           AND (:documento IS NULL OR CAST(p.dni AS string) LIKE CONCAT('%', :documento, '%'))
           AND (:email IS NULL OR LOWER(p.email) LIKE LOWER(CONCAT('%', :email, '%')))
        """)
    Page<Paciente> findByFiltros(@Param("nombreApellido") String nombreApellido,
                                 @Param("documento") String documento,
                                 @Param("email") String email,
                                 Pageable pageable);
}
