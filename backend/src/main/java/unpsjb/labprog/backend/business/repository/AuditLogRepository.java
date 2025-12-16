package unpsjb.labprog.backend.business.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import unpsjb.labprog.backend.model.AuditLog;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {

       // Buscar logs de auditoría por turno
       List<AuditLog> findByTurnoIdOrderByPerformedAtDesc(Integer turnoId);

       // Buscar logs de auditoría por turno con paginación
       Page<AuditLog> findByTurnoId(Integer turnoId, Pageable pageable);

       // Buscar logs por acción
       List<AuditLog> findByActionOrderByPerformedAtDesc(String action);

       // Buscar logs por usuario
       List<AuditLog> findByPerformedByOrderByPerformedAtDesc(String performedBy);

       // Buscar logs en un rango de fechas
       List<AuditLog> findByPerformedAtBetweenOrderByPerformedAtDesc(LocalDateTime start, LocalDateTime end);

       // Buscar logs por tipo de entidad
       List<AuditLog> findByEntityTypeOrderByPerformedAtDesc(String entityType);

       // Buscar logs por tipo de entidad e ID

       // Buscar logs por tipo de entidad con paginación
       Page<AuditLog> findByEntityType(String entityType, Pageable pageable);

       // Buscar logs por tipo de entidad e ID con paginación
       Page<AuditLog> findByEntityTypeAndEntityId(String entityType, Long entityId, Pageable pageable);

       // Buscar logs por acción y tipo de entidad

       // Buscar logs en rango de fechas por tipo de entidad
       List<AuditLog> findByEntityTypeAndPerformedAtBetweenOrderByPerformedAtDesc(String entityType,
                     LocalDateTime start, LocalDateTime end);

       // Buscar logs por usuario y tipo de entidad
       List<AuditLog> findByEntityTypeAndPerformedByOrderByPerformedAtDesc(String entityType, String performedBy);

       // Obtener usuarios únicos que han realizado auditorías
       @Query("SELECT DISTINCT a.performedBy FROM AuditLog a ORDER BY a.performedBy")
       List<String> findDistinctPerformedBy();

       // Contar logs por acción
       @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.action = :action")
       Long countByAction(@Param("action") String action);

       // Contar logs por usuario
       @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.performedBy = :performedBy")
       Long countByPerformedBy(@Param("performedBy") String performedBy);

       // Obtener estadísticas de acciones (para dashboard)
       @Query("SELECT a.action, COUNT(a) FROM AuditLog a GROUP BY a.action ORDER BY COUNT(a) DESC")
       List<Object[]> findActionStatistics();

       // Obtener estadísticas de acciones por día
       @Query("SELECT DATE(a.performedAt) as date, a.action, COUNT(a) as count " +
                     "FROM AuditLog a " +
                     "WHERE a.performedAt >= :startDate " +
                     "GROUP BY DATE(a.performedAt), a.action " +
                     "ORDER BY DATE(a.performedAt) DESC")
       List<Object[]> getActionStatsByDay(@Param("startDate") LocalDateTime startDate);

       // Obtener logs recientes (últimas 24 horas)
       @Query("SELECT a FROM AuditLog a WHERE a.performedAt >= :since ORDER BY a.performedAt DESC")
       List<AuditLog> findRecentLogs(@Param("since") LocalDateTime since);

       // Buscar logs que contengan cambios específicos
       @Query("SELECT a FROM AuditLog a WHERE " +
                     "(a.oldValues IS NOT NULL AND a.oldValues LIKE %:searchTerm%) OR " +
                     "(a.newValues IS NOT NULL AND a.newValues LIKE %:searchTerm%) OR " +
                     "a.reason LIKE %:searchTerm%")
       List<AuditLog> findLogsContaining(@Param("searchTerm") String searchTerm);

       // Eliminar logs antiguos (para limpieza de datos)
       void deleteByPerformedAtBefore(LocalDateTime cutoffDate);

       // Obtener estadísticas de actividad por usuario
       @Query("SELECT a.performedBy, COUNT(a) FROM AuditLog a GROUP BY a.performedBy ORDER BY COUNT(a) DESC")
       List<Object[]> findUserActivityStatistics();

       // Consulta alternativa de auditoría (sin JOIN complejo)
       @Query("SELECT a FROM AuditLog a WHERE a.turno.id = :turnoId ORDER BY a.performedAt DESC")
       List<AuditLog> findAlternativeAuditHistory(@Param("turnoId") Integer turnoId);

       // Consulta más simple sin referencias a turno
       @Query("SELECT a FROM AuditLog a WHERE a.turno.id = :turnoId ORDER BY a.performedAt DESC")
       List<AuditLog> findNativeAuditHistory(@Param("turnoId") Integer turnoId);

       // Verificar la estructura de la tabla para debugging
       @Query(value = "DESCRIBE audit_log", nativeQuery = true)
       List<Object[]> describeAuditLogTable();

       // Contar registros por turno ID para debugging
       @Query(value = "SELECT COUNT(*) FROM audit_log WHERE turno_id = :turnoId", nativeQuery = true)
       Integer countAuditRecordsByTurno(@Param("turnoId") Integer turnoId);

       // Contar registros por turno ID usando JPA
       Long countByTurnoId(Integer turnoId);

       // Obtener solo los IDs de auditoría para un turno
       @Query("SELECT a.id FROM AuditLog a WHERE a.turno.id = :turnoId ORDER BY a.performedAt DESC")
       List<Integer> findAuditIdsByTurnoId(@Param("turnoId") Integer turnoId);

       // Obtener datos básicos sin campos LOB problemáticos
       @Query(value = "SELECT id, action, performed_by, estado_anterior, estado_nuevo, performed_at FROM audit_log WHERE id = :auditId", nativeQuery = true)
       Object[] findBasicAuditData(@Param("auditId") Integer auditId);

       // Obtener fila básica por id (incluye entity_type y entity_id) sin leer LOBs
       @Query(value = "SELECT id, turno_id, entity_type, entity_id, action, performed_at, performed_by, estado_anterior, estado_nuevo, reason FROM audit_log WHERE id = :auditId", nativeQuery = true)
       Object[] findBasicRowById(@Param("auditId") Integer auditId);

       // Preferir una versión JPQL (más portable) que también devuelve un Object[] con los campos esperados
       @Query("SELECT a.id, a.turno.id, a.entityType, a.entityId, a.action, a.performedAt, a.performedBy, a.estadoAnterior, a.estadoNuevo, a.reason FROM AuditLog a WHERE a.id = :auditId")
       Object[] findBasicRowByIdJPQL(@Param("auditId") Integer auditId);

       // Consulta segura sin campos LOB problemáticos
       @Query("SELECT a FROM AuditLog a WHERE a.turno.id = :turnoId ORDER BY a.performedAt DESC")
       List<AuditLog> findSafeAuditHistory(@Param("turnoId") Integer turnoId);

       // Obtener IDs de logs recientes sin campos LOB
       @Query("SELECT a.id FROM AuditLog a WHERE a.performedAt >= :since ORDER BY a.performedAt DESC")
       List<Integer> findRecentLogIds(@Param("since") LocalDateTime since);

       // Obtener datos básicos de logs recientes sin campos LOB problemáticos
       @Query("SELECT a FROM AuditLog a WHERE a.performedAt >= :since ORDER BY a.performedAt DESC")
       List<AuditLog> findSafeRecentLogs(@Param("since") LocalDateTime since);

       // ===============================
       // MÉTODOS PARA AUDITORÍA DE ROLES Y USUARIOS
       // ===============================

       // Buscar logs por tipo de entidad y ID de entidad
       List<AuditLog> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(String entityType, Long entityId);

       // Buscar logs por tipo de entidad y acción
       List<AuditLog> findByEntityTypeAndActionOrderByPerformedAtDesc(String entityType, String action);

       // Consulta segura que obtiene solo campos básicos (sin campos LOB) para evitar problemas de extracción JDBC
       @Query("SELECT a.id, a.turno.id, a.entityType, a.entityId, a.action, a.performedAt, a.performedBy, a.estadoAnterior, a.estadoNuevo, a.reason " +
                     "FROM AuditLog a WHERE a.entityType = :entityType AND a.action = :action ORDER BY a.performedAt DESC")
       List<Object[]> findBasicByEntityTypeAndAction(@Param("entityType") String entityType, @Param("action") String action);

       // Buscar logs por tipo de entidad, ID de entidad y acción
       List<AuditLog> findByEntityTypeAndEntityIdAndActionOrderByPerformedAtDesc(String entityType, Long entityId,
                     String action);

       // Contar logs por tipo de entidad
       @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.entityType = :entityType")
       Long countByEntityType(@Param("entityType") String entityType);

       // Obtener estadísticas de cambios de rol
       @Query("SELECT a.estadoAnterior, a.estadoNuevo, COUNT(a) FROM AuditLog a " +
                     "WHERE a.entityType = 'USER' AND a.action = 'ROLE_CHANGE' " +
                     "GROUP BY a.estadoAnterior, a.estadoNuevo ORDER BY COUNT(a) DESC")
       List<Object[]> findRoleChangeStatistics();

       // Obtener actividad reciente de cambios de rol
       @Query("SELECT a FROM AuditLog a WHERE a.entityType = 'USER' AND a.action = 'ROLE_CHANGE' " +
                     "AND a.performedAt >= :since ORDER BY a.performedAt DESC")
       List<AuditLog> findRecentRoleChanges(@Param("since") LocalDateTime since);

       // Buscar cambios de rol por usuario específico
       @Query("SELECT a FROM AuditLog a WHERE a.entityType = 'USER' AND a.action = 'ROLE_CHANGE' " +
                     "AND a.entityId = :userId ORDER BY a.performedAt DESC")
       List<AuditLog> findRoleChangesByUserId(@Param("userId") Long userId);

       // Obtener logs de creación de usuarios
       @Query("SELECT a FROM AuditLog a WHERE a.entityType = 'USER' AND a.action = 'USER_CREATE' " +
                     "ORDER BY a.performedAt DESC")
       List<AuditLog> findUserCreationLogs();

       // Buscar logs por múltiples acciones
       @Query("SELECT a FROM AuditLog a WHERE a.entityType = :entityType AND a.action IN :actions " +
                     "ORDER BY a.performedAt DESC")
       List<AuditLog> findByEntityTypeAndActionIn(@Param("entityType") String entityType,
                     @Param("actions") List<String> actions);

       // Obtener resumen de actividad de usuarios (creación, cambios de rol, etc.)
       @Query("SELECT a.action, COUNT(a) FROM AuditLog a WHERE a.entityType = 'USER' " +
                     "GROUP BY a.action ORDER BY COUNT(a) DESC")
       List<Object[]> findUserActivitySummary();

       // Buscar logs de un usuario específico ejecutados por otro usuario
       @Query("SELECT a FROM AuditLog a WHERE a.entityType = 'USER' AND a.entityId = :targetUserId " +
                     "AND a.performedBy = :performedBy ORDER BY a.performedAt DESC")
       List<AuditLog> findUserLogsByPerformedBy(@Param("targetUserId") Long targetUserId,
                     @Param("performedBy") String performedBy);

       List<AuditLog> findByTurnoIdAndActionOrderByPerformedAtDesc(Integer turnoId, String action);

       Long countByEntityTypeAndAction(String entityType, String action);

       @Query("SELECT a.entityType, a.action, COUNT(a) FROM AuditLog a GROUP BY a.entityType, a.action ORDER BY a.entityType, COUNT(a) DESC")
       List<Object[]> findActionStatisticsByEntityType();

       @Query("SELECT a.entityType, COUNT(a) FROM AuditLog a GROUP BY a.entityType ORDER BY COUNT(a) DESC")
       List<Object[]> findEntityTypeStatistics();

       @Query("SELECT a.entityType, COUNT(a), " +
                     "SUM(CASE WHEN a.action = 'CREATE' THEN 1 ELSE 0 END), " +
                     "SUM(CASE WHEN a.action = 'UPDATE' THEN 1 ELSE 0 END), " +
                     "SUM(CASE WHEN a.action = 'DELETE' THEN 1 ELSE 0 END), " +
                     "MAX(a.performedAt) " +
                     "FROM AuditLog a " +
                     "GROUP BY a.entityType " +
                     "ORDER BY COUNT(a) DESC")
       List<Object[]> getAuditStatisticsByEntityType();

       @Query("SELECT a.id, a.turno.id, a.entityType, a.entityId, a.action, a.performedAt, a.performedBy, " +
                     "a.estadoAnterior, a.estadoNuevo, a.reason FROM AuditLog a WHERE " +
                     "(:entidad IS NULL OR LOWER(a.entityType) LIKE LOWER(CONCAT('%', :entidad, '%'))) AND " +
                     "(:usuario IS NULL OR LOWER(a.performedBy) LIKE LOWER(CONCAT('%', :usuario, '%'))) AND " +
                     "(:tipoAccion IS NULL OR a.action = :tipoAccion) AND " +
                     "a.performedAt >= :fechaDesde AND a.performedAt <= :fechaHasta")
       Page<Object[]> findByFilters(@Param("entidad") String entidad,
                     @Param("usuario") String usuario,
                     @Param("tipoAccion") String tipoAccion,
                     @Param("fechaDesde") LocalDateTime fechaDesde,
                     @Param("fechaHasta") LocalDateTime fechaHasta,
                     Pageable pageable);

       // Esto es para configuraciones
       // Buscar logs por tipo de entidad con paginación
       Page<AuditLog> findByEntityTypeAndEntityIdOrderByPerformedAtDesc(String entityType, Long entityId,
                     Pageable pageable);

       Optional<AuditLog> findTopByEntityTypeOrderByPerformedAtDesc(String entityType);
}
