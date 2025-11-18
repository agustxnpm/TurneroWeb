package unpsjb.labprog.backend.business.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.EncuestaInvitacion;
import unpsjb.labprog.backend.model.EncuestaInvitacion.EstadoInvitacion;

@Repository
public interface EncuestaInvitacionRepository extends JpaRepository<EncuestaInvitacion, Long> {

    // Verificar si ya existe una invitación para un turno específico
    boolean existsByTurno_Id(Integer turnoId);

    // Verificar si ya existe una invitación para un paciente y turno específicos
    boolean existsByPaciente_IdAndTurno_Id(Integer pacienteId, Integer turnoId);

    // Obtener invitaciones pendientes de envío
    List<EncuestaInvitacion> findByEstado(EstadoInvitacion estado);

    // Obtener invitaciones que pueden ser reintentadas (pendientes y con fecha de reintento vencida)
    @Query("SELECT i FROM EncuestaInvitacion i WHERE i.estado = :estado AND " +
           "(i.fechaProximoReintento IS NULL OR i.fechaProximoReintento < :now)")
    List<EncuestaInvitacion> findInvitacionesParaReintento(
        @Param("estado") EstadoInvitacion estado,
        @Param("now") LocalDateTime now);

    // Obtener TODAS las invitaciones pendientes (sin importar fecha de reintento) - para testing manual
    @Query("SELECT i FROM EncuestaInvitacion i WHERE i.estado = :estado")
    List<EncuestaInvitacion> findInvitacionesPendientesSinFiltroFecha(
        @Param("estado") EstadoInvitacion estado);

    // Obtener invitaciones por paciente
    List<EncuestaInvitacion> findByPaciente_IdOrderByFechaCreacionDesc(Integer pacienteId);

    // Obtener invitaciones por turno
    List<EncuestaInvitacion> findByTurno_IdOrderByFechaCreacionDesc(Integer turnoId);

    // Contar invitaciones enviadas exitosamente en las últimas 24 horas
    @Query("SELECT COUNT(i) FROM EncuestaInvitacion i WHERE i.estado = 'ENVIADA' AND i.fechaEnvio > :desde")
    long countInvitacionesEnviadasDesde(@Param("desde") LocalDateTime desde);

    // Obtener invitaciones expiradas que pueden ser limpiadas
    @Query("SELECT i FROM EncuestaInvitacion i WHERE i.estado IN ('EXPIRADA', 'CANCELADA') AND i.fechaCreacion < :fechaLimite")
    List<EncuestaInvitacion> findInvitacionesExpiradasParaLimpiar(@Param("fechaLimite") LocalDateTime fechaLimite);
}