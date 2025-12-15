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

    /**
     * Obtiene pacientes que tienen al menos un turno en un centro de atención específico
     * Usado para filtrado basado en privacidad: ADMIN/OPERADOR solo ve pacientes de su centro
     * @param centroId ID del centro de atención
     * @return Lista de pacientes con turnos en el centro
     */
    @Query("""
        SELECT DISTINCT p FROM Paciente p
        JOIN Turno t ON t.paciente.id = p.id
        JOIN StaffMedico sm ON t.staffMedico.id = sm.id
        WHERE sm.centroAtencion.id = :centroId
        """)
    java.util.List<Paciente> findPacientesConTurnosEnCentro(@Param("centroId") Integer centroId);

    /**
     * Obtiene pacientes que tienen al menos un turno en un centro de atención específico (paginado)
     * Usado para filtrado basado en privacidad: ADMIN/OPERADOR solo ve pacientes de su centro
     * @param centroId ID del centro de atención
     * @param pageable Configuración de paginación y ordenamiento
     * @return Página de pacientes con turnos en el centro
     */
    @Query("""
        SELECT DISTINCT p FROM Paciente p
        JOIN Turno t ON t.paciente.id = p.id
        JOIN StaffMedico sm ON t.staffMedico.id = sm.id
        WHERE sm.centroAtencion.id = :centroId
        """)
    Page<Paciente> findPacientesConTurnosEnCentro(@Param("centroId") Integer centroId, 
                                                   Pageable pageable);

    /**
     * Obtiene pacientes con filtros combinados + restricción por centro de atención
     * Usado para búsqueda avanzada con filtrado de privacidad
     * @param nombreApellido Filtro unificado para nombre O apellido (LIKE, opcional)
     * @param documento Filtro por DNI (LIKE, opcional)
     * @param email Filtro por email (LIKE, opcional)
     * @param centroId ID del centro de atención (restricción de privacidad)
     * @param pageable Configuración de paginación y ordenamiento
     * @return Página de pacientes filtrados y ordenados
     */
    @Query("""
        SELECT DISTINCT p FROM Paciente p
        JOIN Turno t ON t.paciente.id = p.id
        JOIN StaffMedico sm ON t.staffMedico.id = sm.id
        WHERE sm.centroAtencion.id = :centroId
           AND (:nombreApellido IS NULL OR
                LOWER(p.nombre) LIKE LOWER(CONCAT('%', :nombreApellido, '%')) OR
                LOWER(p.apellido) LIKE LOWER(CONCAT('%', :nombreApellido, '%')))
           AND (:documento IS NULL OR CAST(p.dni AS string) LIKE CONCAT('%', :documento, '%'))
           AND (:email IS NULL OR LOWER(p.email) LIKE LOWER(CONCAT('%', :email, '%')))
        """)
    Page<Paciente> findByFiltrosAndCentro(@Param("nombreApellido") String nombreApellido,
                                          @Param("documento") String documento,
                                          @Param("email") String email,
                                          @Param("centroId") Integer centroId,
                                          Pageable pageable);

    /**
     * Obtiene pacientes que tienen al menos un turno con un staff médico específico
     * Usado para filtrado basado en privacidad: MEDICO solo ve pacientes asignados a él
     * @param staffMedicoId ID del staff médico
     * @return Lista de pacientes con turnos del médico
     */
    @Query("""
        SELECT DISTINCT p FROM Paciente p
        JOIN Turno t ON t.paciente.id = p.id
        WHERE t.staffMedico.id = :staffMedicoId
        """)
    java.util.List<Paciente> findPacientesConTurnosDeStaffMedico(@Param("staffMedicoId") Integer staffMedicoId);

    /**
     * Obtiene pacientes que tienen al menos un turno con un staff médico específico (paginado)
     * Usado para filtrado basado en privacidad: MEDICO solo ve pacientes asignados a él
     * @param staffMedicoId ID del staff médico
     * @param pageable Configuración de paginación y ordenamiento
     * @return Página de pacientes con turnos del médico
     */
    @Query("""
        SELECT DISTINCT p FROM Paciente p
        JOIN Turno t ON t.paciente.id = p.id
        WHERE t.staffMedico.id = :staffMedicoId
        """)
    Page<Paciente> findPacientesConTurnosDeStaffMedico(@Param("staffMedicoId") Integer staffMedicoId,
                                                        Pageable pageable);
}
