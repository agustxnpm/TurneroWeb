package unpsjb.labprog.backend.business.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.PreferenciaHoraria;

import java.util.Optional;

@Repository
public interface PreferenciaHorariaRepository extends JpaRepository<PreferenciaHoraria, Long> {
    
    /**
     * Busca una preferencia por ID y verifica que pertenezca al paciente especificado
     * @param id ID de la preferencia
     * @param pacienteId ID del paciente
     * @return Optional con la preferencia si existe y pertenece al paciente
     */
    Optional<PreferenciaHoraria> findByIdAndPacienteId(Long id, Integer pacienteId);
}
