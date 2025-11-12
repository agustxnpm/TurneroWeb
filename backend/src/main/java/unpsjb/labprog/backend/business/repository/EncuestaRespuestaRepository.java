package unpsjb.labprog.backend.business.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import unpsjb.labprog.backend.model.EncuestaRespuesta;
import unpsjb.labprog.backend.model.TipoPregunta;

@Repository
public interface EncuestaRespuestaRepository extends JpaRepository<EncuestaRespuesta, Long> {

	/**
	 * Verifica si existen respuestas registradas para un turno dado
	 */
	boolean existsByTurno_Id(Integer turnoId);

	/**
	 * Promedio de valores numéricos para tipos de pregunta (CSAT, NPS, RATING_*)
	 * Usa COALESCE para manejar fechas null de forma segura
	 */
	@Query("SELECT AVG(CAST(er.valorNumerico AS double)) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tipos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND (:desde IS NULL OR er.fechaCreacion >= :desde) " +
			"AND (:hasta IS NULL OR er.fechaCreacion <= :hasta)")
	Double averageValorNumericoByTipoInAndFechaBetween(
			@Param("tipos") List<TipoPregunta> tipos,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Conteo de respuestas de texto libre (comentarios no nulos)
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND (:desde IS NULL OR er.fechaCreacion >= :desde) " +
			"AND (:hasta IS NULL OR er.fechaCreacion <= :hasta)")
	Long countTextoLibreByFechaBetween(
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Conteo de respuestas numéricas por debajo o igual a un umbral (p.ej. CSAT <=
	 * 2)
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tiposNumericos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.valorNumerico <= :threshold " +
			"AND (:desde IS NULL OR er.fechaCreacion >= :desde) " +
			"AND (:hasta IS NULL OR er.fechaCreacion <= :hasta)")
	Long countLowScoreByTiposAndFechaBetween(
			@Param("tiposNumericos") List<TipoPregunta> tiposNumericos,
			@Param("threshold") Integer threshold,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Obtener comentarios de texto libre dentro de un rango
	 */
	@Query("SELECT er.valorTexto FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND (:desde IS NULL OR er.fechaCreacion >= :desde) " +
			"AND (:hasta IS NULL OR er.fechaCreacion <= :hasta) " +
			"ORDER BY er.fechaCreacion DESC")
	List<String> findComentariosByFechaBetween(
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

}