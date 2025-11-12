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

	// ========== QUERIES PARA PROMEDIOS - CON RANGO DE FECHAS ==========

	/**
	 * Promedio con rango de fechas COMPLETO
	 */
	@Query("SELECT AVG(CAST(er.valorNumerico AS double)) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tipos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.fechaCreacion >= :desde " +
			"AND er.fechaCreacion <= :hasta")
	Double averageValorNumericoByTipoInAndFechasBetween(
			@Param("tipos") List<TipoPregunta> tipos,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Promedio sin filtro de fechas (todos los registros)
	 */
	@Query("SELECT AVG(CAST(er.valorNumerico AS double)) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tipos " +
			"AND er.valorNumerico IS NOT NULL")
	Double averageValorNumericoByTipoIn(@Param("tipos") List<TipoPregunta> tipos);

	/**
	 * Promedio con fecha DESDE solamente
	 */
	@Query("SELECT AVG(CAST(er.valorNumerico AS double)) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tipos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.fechaCreacion >= :desde")
	Double averageValorNumericoByTipoInAndFechaDesde(
			@Param("tipos") List<TipoPregunta> tipos,
			@Param("desde") LocalDateTime desde);

	/**
	 * Promedio con fecha HASTA solamente
	 */
	@Query("SELECT AVG(CAST(er.valorNumerico AS double)) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tipos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.fechaCreacion <= :hasta")
	Double averageValorNumericoByTipoInAndFechaHasta(
			@Param("tipos") List<TipoPregunta> tipos,
			@Param("hasta") LocalDateTime hasta);

	// ========== QUERIES PARA CONTAR TEXTO LIBRE ==========

	/**
	 * Conteo de texto libre con rango completo
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND er.fechaCreacion >= :desde " +
			"AND er.fechaCreacion <= :hasta")
	Long countTextoLibreByFechasBetween(
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Conteo de texto libre sin filtro de fechas
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> ''")
	Long countTextoLibre();

	/**
	 * Conteo de texto libre desde fecha
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND er.fechaCreacion >= :desde")
	Long countTextoLibreByFechaDesde(@Param("desde") LocalDateTime desde);

	/**
	 * Conteo de texto libre hasta fecha
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND er.fechaCreacion <= :hasta")
	Long countTextoLibreByFechaHasta(@Param("hasta") LocalDateTime hasta);

	// ========== QUERIES PARA PUNTUACIONES BAJAS ==========

	/**
	 * Conteo de puntuaciones bajas con rango completo
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tiposNumericos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.valorNumerico <= :threshold " +
			"AND er.fechaCreacion >= :desde " +
			"AND er.fechaCreacion <= :hasta")
	Long countLowScoreByTiposAndFechasBetween(
			@Param("tiposNumericos") List<TipoPregunta> tiposNumericos,
			@Param("threshold") Integer threshold,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Conteo de puntuaciones bajas sin filtro de fechas
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tiposNumericos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.valorNumerico <= :threshold")
	Long countLowScoreByTipos(
			@Param("tiposNumericos") List<TipoPregunta> tiposNumericos,
			@Param("threshold") Integer threshold);

	/**
	 * Conteo de puntuaciones bajas desde fecha
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tiposNumericos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.valorNumerico <= :threshold " +
			"AND er.fechaCreacion >= :desde")
	Long countLowScoreByTiposAndFechaDesde(
			@Param("tiposNumericos") List<TipoPregunta> tiposNumericos,
			@Param("threshold") Integer threshold,
			@Param("desde") LocalDateTime desde);

	/**
	 * Conteo de puntuaciones bajas hasta fecha
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tiposNumericos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND er.valorNumerico <= :threshold " +
			"AND er.fechaCreacion <= :hasta")
	Long countLowScoreByTiposAndFechaHasta(
			@Param("tiposNumericos") List<TipoPregunta> tiposNumericos,
			@Param("threshold") Integer threshold,
			@Param("hasta") LocalDateTime hasta);

	// ========== QUERIES PARA COMENTARIOS ==========

	/**
	 * Obtener comentarios con rango completo
	 */
	@Query("SELECT er.valorTexto FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND er.fechaCreacion >= :desde " +
			"AND er.fechaCreacion <= :hasta " +
			"ORDER BY er.fechaCreacion DESC")
	List<String> findComentariosByFechasBetween(
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Obtener comentarios sin filtro de fechas
	 */
	@Query("SELECT er.valorTexto FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"ORDER BY er.fechaCreacion DESC")
	List<String> findComentarios();

	/**
	 * Obtener comentarios desde fecha
	 */
	@Query("SELECT er.valorTexto FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND er.fechaCreacion >= :desde " +
			"ORDER BY er.fechaCreacion DESC")
	List<String> findComentariosByFechaDesde(@Param("desde") LocalDateTime desde);

	/**
	 * Obtener comentarios hasta fecha
	 */
	@Query("SELECT er.valorTexto FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL " +
			"AND TRIM(er.valorTexto) <> '' " +
			"AND er.fechaCreacion <= :hasta " +
			"ORDER BY er.fechaCreacion DESC")
	List<String> findComentariosByFechaHasta(@Param("hasta") LocalDateTime hasta);
}