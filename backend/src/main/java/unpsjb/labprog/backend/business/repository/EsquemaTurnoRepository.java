package unpsjb.labprog.backend.business.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.EsquemaTurno;

@Repository
public interface EsquemaTurnoRepository extends JpaRepository<EsquemaTurno, Integer> {

    List<EsquemaTurno> findByStaffMedicoId(Integer staffMedicoId);
    
    List<EsquemaTurno> findByConsultorioId(Integer consultorioId);
    
    List<EsquemaTurno> findByCentroAtencionId(Integer centroAtencionId);

    List<EsquemaTurno> findByDisponibilidadMedicoId(Integer disponibilidadMedicoId);

    /**
     * Encuentra esquemas de turno para una especialidad y centro específicos
     */
    List<EsquemaTurno> findByStaffMedico_Especialidad_IdAndCentroAtencion_Id(Integer especialidadId, Integer centroId);

    /**
     * Búsqueda paginada avanzada con filtros combinados y ordenamiento dinámico
     * @param staffMedico Filtro por nombre o apellido del staff médico (LIKE, opcional)
     * @param consultorio Filtro por nombre del consultorio (LIKE, opcional)
     * @param centro Filtro por nombre del centro de atención (LIKE, opcional)
     * @param pageable Configuración de paginación y ordenamiento
     * @return Página de esquemas de turno filtrados y ordenados
     */
    @Query("""
        SELECT et FROM EsquemaTurno et
        JOIN et.staffMedico sm
        JOIN sm.medico m
        JOIN et.consultorio c
        JOIN et.centroAtencion ca
        WHERE (:staffMedico IS NULL OR 
               LOWER(CONCAT(m.nombre, ' ', m.apellido)) LIKE LOWER(CONCAT('%', :staffMedico, '%')))
           AND (:consultorio IS NULL OR 
                LOWER(c.nombre) LIKE LOWER(CONCAT('%', :consultorio, '%')))
           AND (:centro IS NULL OR 
                LOWER(ca.nombre) LIKE LOWER(CONCAT('%', :centro, '%')))
        """)
    Page<EsquemaTurno> findByFiltros(@Param("staffMedico") String staffMedico,
                                     @Param("consultorio") String consultorio,
                                     @Param("centro") String centro,
                                     Pageable pageable);

}