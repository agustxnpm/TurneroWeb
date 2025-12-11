package unpsjb.labprog.backend.business.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.Medico;

@Repository
public interface MedicoRepository extends JpaRepository<Medico, Integer> {
    boolean existsByDni(Long dni);
    boolean existsByMatricula(String matricula);
    boolean existsByEmail(String email);

    Optional<Medico> findByDni(Long dni);
    Optional<Medico> findByMatricula(String matricula);
    Optional<Medico> findByEmail(String email);

    /**
     * Método para búsqueda paginada con filtros combinados y ordenamiento dinámico
     * @param nombre Filtro por nombre (LIKE, opcional)
     * @param especialidad Filtro por especialidad (LIKE en nombre de especialidad, opcional)
     * @param estado Filtro por estado (activo/inactivo basado en existencia de usuario, opcional)
     * @param pageable Configuración de paginación y ordenamiento
     * @return Página de médicos filtrados y ordenados
     */
    @Query("""
        SELECT m FROM Medico m
        LEFT JOIN User u ON u.email = m.email
        WHERE (:nombre IS NULL OR LOWER(m.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))
               OR LOWER(m.apellido) LIKE LOWER(CONCAT('%', :nombre, '%')))
           AND (:especialidad IS NULL OR EXISTS (
               SELECT 1 FROM m.especialidades e WHERE LOWER(e.nombre) LIKE LOWER(CONCAT('%', :especialidad, '%'))
           ))
           AND (:estado IS NULL OR
                (:estado = 'activo' AND u IS NOT NULL) OR
                (:estado = 'inactivo' AND u IS NULL))
        """)
    Page<Medico> findByFiltros(@Param("nombre") String nombre,
                              @Param("especialidad") String especialidad,
                              @Param("estado") String estado,
                              Pageable pageable);
    
    // ===== MÉTODOS MULTI-TENENCIA =====
    // Nota: Medico es una entidad global, la restricción por centro se hace mediante StaffMedico
    // Estos métodos buscan médicos que trabajen en un centro específico
    
    /**
     * Encuentra médicos que trabajan en un centro específico (a través de StaffMedico)
     * @param centroId ID del centro de atención
     * @return Lista de médicos que atienden en el centro
     */
    @Query("""
        SELECT DISTINCT m FROM Medico m
        JOIN StaffMedico sm ON sm.medico.id = m.id
        WHERE sm.centroAtencion.id = :centroId
        """)
    List<Medico> findByCentroAtencionId(@Param("centroId") Integer centroId);
    
    /**
     * Encuentra médicos que trabajan en un centro específico con paginación
     * @param centroId ID del centro de atención
     * @param pageable Configuración de paginación
     * @return Página de médicos que atienden en el centro
     */
    @Query("""
        SELECT DISTINCT m FROM Medico m
        JOIN StaffMedico sm ON sm.medico.id = m.id
        WHERE sm.centroAtencion.id = :centroId
        """)
    Page<Medico> findByCentroAtencionId(@Param("centroId") Integer centroId, Pageable pageable);
}
