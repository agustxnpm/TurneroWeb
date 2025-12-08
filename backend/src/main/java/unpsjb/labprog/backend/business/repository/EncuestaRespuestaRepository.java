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

	/**
	 * 
	 * Obtener turnos con encuestas - TODOS LOS FILTROS
	 * 
	 */

	@Query("SELECT DISTINCT er.turno.id FROM EncuestaRespuesta er " +
			"WHERE er.turno.centroAtencion.id = :centroId " +
			"AND er.fechaCreacion >= :desde " +
			"AND er.fechaCreacion <= :hasta " +
			"ORDER BY er.fechaCreacion DESC")
	List<Integer> findTurnosConEncuestasByCentroAndFechas(
			@Param("centroId") Integer centroId,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * 
	 * Obtener turnos con encuestas - SIN FILTROS
	 * 
	 */
	@Query("SELECT DISTINCT er.turno.id FROM EncuestaRespuesta er " +
			"ORDER BY er.fechaCreacion DESC")
	List<Integer> findTurnosConEncuestas();

	/**
	 * 
	 * Obtener turnos con encuestas - SOLO CENTRO
	 * 
	 */
	@Query("SELECT DISTINCT er.turno.id FROM EncuestaRespuesta er " +
			"WHERE er.turno.centroAtencion.id = :centroId " +
			"ORDER BY er.fechaCreacion DESC")
	List<Integer> findTurnosConEncuestasByCentro(@Param("centroId") Integer centroId);

	/**
	 * 
	 * Obtener turnos con encuestas - SOLO FECHAS
	 * 
	 */

	@Query("SELECT DISTINCT er.turno.id FROM EncuestaRespuesta er " +
			"WHERE er.fechaCreacion >= :desde " +
			"AND er.fechaCreacion <= :hasta " +
			"ORDER BY er.fechaCreacion DESC")
	List<Integer> findTurnosConEncuestasByFechas(
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * 
	 * Obtener turnos con encuestas - CENTRO Y DESDE
	 * 
	 */
	@Query("SELECT DISTINCT er.turno.id FROM EncuestaRespuesta er " +
			"WHERE er.turno.centroAtencion.id = :centroId " +
			"AND er.fechaCreacion >= :desde " +
			"ORDER BY er.fechaCreacion DESC")
	List<Integer> findTurnosConEncuestasByCentroAndDesde(
			@Param("centroId") Integer centroId,
			@Param("desde") LocalDateTime desde);

	/**
	 * 
	 * Obtener turnos con encuestas - CENTRO Y HASTA
	 * 
	 */
	@Query("SELECT DISTINCT er.turno.id FROM EncuestaRespuesta er " +
			"WHERE er.turno.centroAtencion.id = :centroId " +
			"AND er.fechaCreacion <= :hasta " +
			"ORDER BY er.fechaCreacion DESC")
	List<Integer> findTurnosConEncuestasByCentroAndHasta(
			@Param("centroId") Integer centroId,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * 
	 * Obtener turnos con encuestas - SOLO DESDE
	 * 
	 */
	@Query("SELECT DISTINCT er.turno.id FROM EncuestaRespuesta er " +
			"WHERE er.fechaCreacion >= :desde " +
			"ORDER BY er.fechaCreacion DESC")
	List<Integer> findTurnosConEncuestasByDesde(@Param("desde") LocalDateTime desde);
	// ==========================================
	// MÉTRICAS CONSOLIDADAS (Centro Opcional + Rango Obligatorio)
	// ==========================================

	/**
	 * Calcula promedio.
	 * Truco: Si centroId es NULL, la parte (:centroId IS NULL) se hace verdadera y
	 * trae todo.
	 */
	@Query("SELECT AVG(CAST(er.valorNumerico AS double)) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tipos " +
			"AND er.valorNumerico IS NOT NULL " +
			"AND (:centroId IS NULL OR er.turno.centroAtencion.id = :centroId) " +
			"AND er.fechaCreacion BETWEEN :desde AND :hasta")
	Double calcularPromedio(
			@Param("centroId") Integer centroId,
			@Param("tipos") List<TipoPregunta> tipos,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Cuenta comentarios de texto.
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo = unpsjb.labprog.backend.model.TipoPregunta.TEXTO_LIBRE " +
			"AND er.valorTexto IS NOT NULL AND TRIM(er.valorTexto) <> '' " +
			"AND (:centroId IS NULL OR er.turno.centroAtencion.id = :centroId) " +
			"AND er.fechaCreacion BETWEEN :desde AND :hasta")
	Long contarComentarios(
			@Param("centroId") Integer centroId,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	/**
	 * Cuenta alertas (puntuaciones bajas).
	 */
	@Query("SELECT COUNT(er) FROM EncuestaRespuesta er " +
			"JOIN er.pregunta p " +
			"WHERE p.tipo IN :tipos " +
			"AND er.valorNumerico <= :threshold " +
			"AND (:centroId IS NULL OR er.turno.centroAtencion.id = :centroId) " +
			"AND er.fechaCreacion BETWEEN :desde AND :hasta")
	Long contarAlertas(
			@Param("centroId") Integer centroId,
			@Param("tipos") List<TipoPregunta> tipos,
			@Param("threshold") Integer threshold,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	// MANTENER: Método para el listado detallado (el que ya arreglaste)
	@Query("SELECT er.turno.id FROM EncuestaRespuesta er " +
			"WHERE (:centroId IS NULL OR er.turno.centroAtencion.id = :centroId) " +
			"AND er.fechaCreacion BETWEEN :desde AND :hasta " +
			"GROUP BY er.turno.id " +
			"ORDER BY MAX(er.fechaCreacion) DESC")
	List<Integer> findTurnosConEncuestas(
			@Param("centroId") Integer centroId,
			@Param("desde") LocalDateTime desde,
			@Param("hasta") LocalDateTime hasta);

	// MANTENER: Para detalles del turno
	@Query("SELECT er FROM EncuestaRespuesta er " +
			"JOIN FETCH er.pregunta " +
			"JOIN FETCH er.turno t " +
			"JOIN FETCH t.paciente " +
			"WHERE er.turno.id = :turnoId " +
			"ORDER BY er.pregunta.id ASC")
	List<EncuestaRespuesta> findAllByTurnoIdWithDetails(@Param("turnoId") Integer turnoId);
}
