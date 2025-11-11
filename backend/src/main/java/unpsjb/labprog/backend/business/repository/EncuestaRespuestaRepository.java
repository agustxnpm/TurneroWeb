package unpsjb.labprog.backend.business.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.EncuestaRespuesta;

@Repository
public interface EncuestaRespuestaRepository extends JpaRepository<EncuestaRespuesta, Long> {

	/**
	 * Verifica si existen respuestas registradas para un turno dado
	 */
	boolean existsByTurno_Id(Integer turnoId);

}
