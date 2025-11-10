package unpsjb.labprog.backend.business.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageImpl;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import unpsjb.labprog.backend.business.repository.AuditLogRepository;
import unpsjb.labprog.backend.model.AuditLog;
import unpsjb.labprog.backend.model.EstadoTurno;
import unpsjb.labprog.backend.model.Turno;

/**
 * Servicio para gestionar los registros de auditoría de turnos.
 * Garantiza la inmutabilidad de los registros una vez creados.
 */
@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ObjectMapper objectMapper; // Usar el ObjectMapper configurado de Spring

    @Autowired
    @Lazy
    private CentroAtencionService centroAtencionService;

    /**
     * Registra una acción de auditoría para un turno.
     * Este método es inmutable - una vez guardado el registro no puede modificarse.
     */
    @Transactional
    public AuditLog logTurnoAction(Turno turno, String action, String performedBy,
            String previousStatus, String newStatus,
            Object oldValues, Object newValues, String reason) {

        System.out.println("🔍 DEBUG logTurnoAction: Turno ID: " + turno.getId() + ", Acción: " + action + ", Usuario: "
                + performedBy);

        try {
            String oldValuesJson = oldValues != null ? objectMapper.writeValueAsString(oldValues) : null;
            String newValuesJson = newValues != null ? objectMapper.writeValueAsString(newValues) : null;

            AuditLog auditLog = new AuditLog(
                    turno, action, performedBy, previousStatus, newStatus,
                    oldValuesJson, newValuesJson, reason);

            System.out.println("🔍 DEBUG: Guardando en base de datos...");
            // Guardar de forma inmutable
            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println(
                    "✅ DEBUG: AuditLog guardado con ID: " + saved.getId() + ", Fecha: " + saved.getPerformedAt());
            return saved;

        } catch (JsonProcessingException e) {
            System.err.println("❌ ERROR: Error al serializar datos de auditoría: " + e.getMessage());
            throw new RuntimeException("Error al serializar datos de auditoría", e);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al guardar AuditLog: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Registra la creación de un turno
     */
    @Transactional
    public AuditLog logTurnoCreated(Turno turno, String performedBy) {

        System.out.println("🔍 DEBUG AuditLogService: Iniciando logTurnoCreated para turno ID: " + turno.getId()
                + ", Usuario: " + performedBy);

        // Crear un mapa con datos serializables del turno
        Map<String, Object> turnoData = new HashMap<>();
        turnoData.put("id", turno.getId());
        turnoData.put("fecha", turno.getFecha().toString()); // Convertir LocalDate a String
        turnoData.put("horaInicio", turno.getHoraInicio().toString()); // Convertir LocalTime a String
        turnoData.put("horaFin", turno.getHoraFin().toString()); // Convertir LocalTime a String
        turnoData.put("estado", turno.getEstado().name());
        turnoData.put("pacienteId", turno.getPaciente().getId());
        // StaffMedico puede ser null si fue desvinculado
        if (turno.getStaffMedico() != null) {
            turnoData.put("staffMedicoId", turno.getStaffMedico().getId());
        }
        if (turno.getConsultorio() != null) {
            turnoData.put("consultorioId", turno.getConsultorio().getId());
        }

        AuditLog result = logTurnoAction(turno, "CREATE", performedBy,
                null, turno.getEstado().name(),
                null, turnoData, null); // Pasar el mapa en lugar del objeto
        System.out.println("✅ DEBUG AuditLogService: Log creado con ID: " + result.getId());
        return result;

    }

    /**
     * Registra un cambio de estado de turno
     */
    @Transactional
    public AuditLog logStatusChange(Turno turno, String previousStatus, String performedBy, String reason) {
        return logTurnoAction(turno, "UPDATE_STATUS", performedBy,
                previousStatus, turno.getEstado().name(),
                null, null, reason);

    }

    /**
     * Registra la cancelación de un turno (con motivo obligatorio)
     */
    @Transactional
    public AuditLog logTurnoCanceled(Turno turno, String previousStatus, String performedBy, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("El motivo de cancelación es obligatorio");
        }
        return logTurnoAction(turno, "CANCEL", performedBy,
                previousStatus, turno.getEstado().name(),
                null, null, reason);

    }

    /**
     * Registra la confirmación de un turno
     */
    @Transactional
    public AuditLog logTurnoConfirmed(Turno turno, String previousStatus, String performedBy) {
        return logTurnoAction(turno, "CONFIRM", performedBy,
                previousStatus, turno.getEstado().name(),
                null, null, null);

    }

    /**
     * Registra la finalización/completar de un turno
     */
    @Transactional
    public AuditLog logTurnoCompleted(Turno turno, String previousStatus, String performedBy) {
        return logTurnoAction(turno, "COMPLETE", performedBy,
                previousStatus, turno.getEstado().name(),
                null, null, null);

    }

    /**
     * Registra el reagendamiento de un turno
     */
    @Transactional
    public AuditLog logTurnoRescheduled(Turno turno, String previousStatus, Object oldValues,
            String performedBy, String reason) {
        // Crear nuevos valores simplificados para evitar problemas de serialización
        Map<String, Object> newValues = new HashMap<>();
        newValues.put("fecha", turno.getFecha().toString());
        newValues.put("horaInicio", turno.getHoraInicio().toString());
        newValues.put("horaFin", turno.getHoraFin().toString());
        newValues.put("estado", turno.getEstado().name());
        return logTurnoAction(turno, "RESCHEDULE", performedBy,
                previousStatus, turno.getEstado().name(),
                oldValues, newValues, reason);
    }

    /**
     * Registra la eliminación de un turno
     */
    @Transactional
    public AuditLog logTurnoDeleted(Turno turno, String performedBy, String reason) {
        return logTurnoAction(turno, "DELETE", performedBy,
                turno.getEstado().name(), "DELETED",
                turno, null, reason);
    }

    /**
     * Registra el marcado de asistencia de un turno
     */
    @Transactional
    public AuditLog logAsistenciaRegistrada(Turno turno, EstadoTurno previousStatus,
            Boolean previousAsistio, String performedBy, String reason) {
        // Crear mapa con valores anteriores
        Map<String, Object> oldValues = new HashMap<>();
        oldValues.put("estado", previousStatus.name());
        oldValues.put("asistio", previousAsistio);

        // Crear mapa con valores nuevos
        Map<String, Object> newValues = new HashMap<>();
        newValues.put("estado", turno.getEstado().name());
        newValues.put("asistio", turno.getAsistio());

        return logTurnoAction(
                turno,
                "MARK_ATTENDANCE",
                performedBy,
                previousStatus.name(),
                turno.getEstado().name(),
                oldValues,
                newValues,
                reason);
    }

    /**
     * Obtiene el historial de auditoría de un turno específico
     */
    public List<AuditLog> getTurnoAuditHistory(Integer turnoId) {
        System.out.println("🔍 DEBUG: Obteniendo historial de auditoría para turno ID: " + turnoId);
        try {
            // Primero contar cuántos registros hay
            Long count = auditLogRepository.countByTurnoId(turnoId);
            System.out.println("🔍 DEBUG: Contando registros de auditoría para turno " + turnoId + "...");
            System.out.println("✅ DEBUG: Se encontraron " + count + " registros para el turno " + turnoId);

            if (count == 0) {
                return new java.util.ArrayList<>();
            }

            // Intentar obtener los registros uno por uno para identificar el problemático
            return getAuditRecordsIndividually(turnoId);

        } catch (Exception e) {
            System.err.println(
                    "❌ ERROR: Fallo al obtener historial de auditoría para turno " + turnoId + ": " + e.getMessage());
            System.err.println("❌ ERROR: Detalles del error: " + e.getClass().getSimpleName());

            // Intentar obtener registros individualmente
            try {
                return getAuditRecordsIndividually(turnoId);
            } catch (Exception e2) {
                System.err.println("❌ ERROR: Todas las consultas fallaron. Retornando lista vacía");
                System.err.println("❌ ERROR: Último error: " + e2.getMessage());
                return new java.util.ArrayList<>();
            }
        }
    }

    /**
     * Obtiene registros de auditoría uno por uno para identificar el problemático
     */
    private List<AuditLog> getAuditRecordsIndividually(Integer turnoId) {
        System.out.println("🔍 DEBUG: Obteniendo registros individualmente para turno " + turnoId);

        List<AuditLog> validRecords = new java.util.ArrayList<>();

        try {
            // Primero obtener solo los IDs de los registros
            List<Integer> auditIds = auditLogRepository.findAuditIdsByTurnoId(turnoId);
            System.out.println("🔍 DEBUG: Encontrados " + auditIds.size() + " IDs de auditoría: " + auditIds);

            // Ahora obtener cada registro individualmente
            for (Integer auditId : auditIds) {
                try {
                    System.out.println("🔍 DEBUG: Obteniendo registro de auditoría ID: " + auditId);
                    AuditLog record = auditLogRepository.findById(auditId).orElse(null);
                    if (record != null) {
                        validRecords.add(record);
                        System.out.println("✅ DEBUG: Registro " + auditId + " obtenido exitosamente");
                    } else {
                        System.err.println("⚠️ WARN: Registro " + auditId + " no encontrado");
                    }
                } catch (Exception e) {
                    System.err.println("❌ ERROR: Fallo al obtener registro " + auditId + ": " + e.getMessage());
                    // Intentar obtener los datos básicos directamente
                    try {
                        Object[] basicData = auditLogRepository.findBasicAuditData(auditId);
                        if (basicData != null && basicData.length >= 6) {
                            System.out.println("🔍 DEBUG: Datos básicos del registro " + auditId + ":");
                            System.out.println("  - ID: " + basicData[0]);
                            System.out.println("  - Acción: " + basicData[1]);
                            System.out.println("  - Usuario: " + basicData[2]);
                            System.out.println("  - Estado anterior: " + basicData[3]);
                            System.out.println("  - Estado nuevo: " + basicData[4]);
                            System.out.println("  - Fecha: " + basicData[5]);
                            System.err.println("⚠️ WARN: Registro " + auditId
                                    + " tiene datos corruptos en old_values o new_values");
                        }
                    } catch (Exception e2) {
                        System.err.println("❌ ERROR: No se pudieron obtener ni los datos básicos del registro "
                                + auditId + ": " + e2.getMessage());
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo al obtener IDs de auditoría: " + e.getMessage());
        }

        // Ordenar por fecha descendente
        validRecords.sort((a, b) -> b.getPerformedAt().compareTo(a.getPerformedAt()));

        System.out.println("✅ DEBUG: Se obtuvieron " + validRecords.size() + " registros válidos de auditoría");
        return validRecords;
    }

    /**
     * Obtiene el historial de auditoría de un turno con paginación
     */
    public Page<AuditLog> getTurnoAuditHistoryPaged(Integer turnoId, Pageable pageable) {
        return auditLogRepository.findByTurnoId(turnoId, pageable);
    }

    /**
     * Obtiene logs de auditoría por acción
     */
    public List<AuditLog> getLogsByAction(String action) {
        System.out.println("🔍 DEBUG: Obteniendo logs por acción: " + action);

        try {
            List<AuditLog> results = auditLogRepository.findByActionOrderByPerformedAtDesc(action);
            System.out.println("✅ DEBUG: Encontrados " + results.size() + " logs para la acción: " + action);
            return results;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo al obtener logs por acción " + action + ": " + e.getMessage());
            System.err.println("⚠️ WARN: Puede haber registros con campos LOB problemáticos para esta acción");
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene logs de auditoría por usuario
     */
    public List<AuditLog> getLogsByUser(String performedBy) {
        System.out.println("🔍 DEBUG: Obteniendo logs por usuario: " + performedBy);

        try {
            List<AuditLog> results = auditLogRepository.findByPerformedByOrderByPerformedAtDesc(performedBy);
            System.out.println("✅ DEBUG: Encontrados " + results.size() + " logs para el usuario: " + performedBy);
            return results;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo al obtener logs por usuario " + performedBy + ": " + e.getMessage());
            System.err.println("⚠️ WARN: Puede haber registros con campos LOB problemáticos para este usuario");
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene logs de auditoría en un rango de fechas
     */
    public List<AuditLog> getLogsByDateRange(LocalDateTime start, LocalDateTime end) {
        System.out.println("🔍 DEBUG: Obteniendo logs por rango de fechas: " + start + " - " + end);

        try {
            List<AuditLog> results = auditLogRepository.findByPerformedAtBetweenOrderByPerformedAtDesc(start, end);
            System.out.println("✅ DEBUG: Encontrados " + results.size() + " logs en el rango de fechas");
            return results;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo al obtener logs por rango de fechas: " + e.getMessage());
            System.err.println("⚠️ WARN: Puede haber registros con campos LOB problemáticos en este rango");
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene logs de auditoría por turno y acción específica
     */
    public List<AuditLog> getLogsByTurnoAndAction(Integer turnoId, String action) {
        System.out.println("🔍 DEBUG: Obteniendo logs por turno " + turnoId + " y acción: " + action);

        try {
            List<AuditLog> results = auditLogRepository.findByTurnoIdAndActionOrderByPerformedAtDesc(turnoId, action);
            System.out.println(
                    "✅ DEBUG: Encontrados " + results.size() + " logs para turno " + turnoId + " y acción " + action);
            return results;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo al obtener logs por turno y acción: " + e.getMessage());
            System.err.println("⚠️ WARN: Puede haber registros con campos LOB problemáticos");
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene usuarios únicos que han realizado auditorías
     */
    public List<String> getUniqueUsers() {
        return auditLogRepository.findDistinctPerformedBy();
    }

    /**
     * Obtiene estadísticas de acciones
     */
    public List<Object[]> getActionStatistics() {
        System.out.println("🔍 DEBUG: Obteniendo estadísticas de acciones...");
        List<Object[]> stats = auditLogRepository.findActionStatistics();
        System.out.println("✅ DEBUG: Estadísticas obtenidas: " + stats.size() + " resultados");
        stats.forEach(stat -> System.out.println("  - " + stat[0] + ": " + stat[1]));
        return stats;
    }

    /**
     * Obtiene estadísticas de acciones por día
     */
    public List<Object[]> getActionStatsByDay(LocalDateTime startDate) {
        return auditLogRepository.getActionStatsByDay(startDate);
    }

    /**
     * Obtiene logs recientes (últimas 24 horas)
     */
    public List<AuditLog> getRecentLogs() {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        System.out.println("🔍 DEBUG: Obteniendo logs recientes desde: " + since);

        try {
            // Intentar primero la consulta normal
            List<AuditLog> recentLogs = auditLogRepository.findRecentLogs(since);
            System.out
                    .println("✅ DEBUG: Se obtuvieron " + recentLogs.size() + " logs recientes usando consulta normal");
            return recentLogs;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo en consulta normal de logs recientes: " + e.getMessage());
            System.err.println("🔍 DEBUG: Intentando consulta segura alternativa...");

            try {
                // Usar consulta segura alternativa
                return getRecentLogsIndividually(since);

            } catch (Exception e2) {
                System.err.println("❌ ERROR: Todas las consultas de logs recientes fallaron. Retornando lista vacía");
                System.err.println("❌ ERROR: Último error: " + e2.getMessage());
                return new java.util.ArrayList<>();
            }
        }
    }

    /**
     * Obtiene logs recientes individualmente para evitar problemas con campos LOB
     */
    private List<AuditLog> getRecentLogsIndividually(LocalDateTime since) {
        System.out.println("🔍 DEBUG: Obteniendo logs recientes individualmente desde: " + since);

        List<AuditLog> validRecords = new java.util.ArrayList<>();

        try {
            // Primero obtener solo los IDs de los logs recientes
            List<Integer> recentIds = auditLogRepository.findRecentLogIds(since);
            System.out.println("🔍 DEBUG: Encontrados " + recentIds.size() + " IDs de logs recientes: " + recentIds);

            // Ahora obtener cada registro individualmente
            for (Integer logId : recentIds) {
                try {
                    System.out.println("🔍 DEBUG: Obteniendo log reciente ID: " + logId);
                    AuditLog record = auditLogRepository.findById(logId).orElse(null);
                    if (record != null) {
                        validRecords.add(record);
                        System.out.println("✅ DEBUG: Log reciente " + logId + " obtenido exitosamente");
                    } else {
                        System.err.println("⚠️ WARN: Log reciente " + logId + " no encontrado");
                    }
                } catch (Exception e) {
                    System.err.println("❌ ERROR: Fallo al obtener log reciente " + logId + ": " + e.getMessage());
                    // Intentar obtener los datos básicos directamente
                    try {
                        Object[] basicData = auditLogRepository.findBasicAuditData(logId);
                        if (basicData != null && basicData.length >= 6) {
                            System.out.println("🔍 DEBUG: Datos básicos del log reciente " + logId + ":");
                            System.out.println("  - ID: " + basicData[0]);
                            System.out.println("  - Acción: " + basicData[1]);
                            System.out.println("  - Usuario: " + basicData[2]);
                            System.out.println("  - Estado anterior: " + basicData[3]);
                            System.out.println("  - Estado nuevo: " + basicData[4]);
                            System.out.println("  - Fecha: " + basicData[5]);
                            System.err.println("⚠️ WARN: Log reciente " + logId
                                    + " tiene datos corruptos en old_values o new_values");
                        }
                    } catch (Exception e2) {
                        System.err.println("❌ ERROR: No se pudieron obtener ni los datos básicos del log reciente "
                                + logId + ": " + e2.getMessage());
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo al obtener IDs de logs recientes: " + e.getMessage());
            System.err.println("🔍 DEBUG: Intentando consulta de datos básicos directamente...");

            try {
                // Como último recurso, usar la consulta de datos básicos
                List<AuditLog> basicLogs = auditLogRepository.findSafeRecentLogs(since);
                System.out.println("🔍 DEBUG: Obtenidos " + basicLogs.size() + " registros básicos de logs recientes");

                // Por ahora retornar lista vacía, pero imprimir los datos para debug
                basicLogs.forEach(log -> {
                    System.out.println("📋 DEBUG: Log básico - ID: " + log.getId() + ", Acción: " + log.getAction()
                            + ", Usuario: " + log.getPerformedBy() + ", Fecha: " + log.getPerformedAt() + ", Motivo: "
                            + log.getReason());
                });

            } catch (Exception e3) {
                System.err.println("❌ ERROR: Ni siquiera la consulta básica funcionó: " + e3.getMessage());
            }
        }

        // Ordenar por fecha descendente
        validRecords.sort((a, b) -> b.getPerformedAt().compareTo(a.getPerformedAt()));

        System.out.println("✅ DEBUG: Se obtuvieron " + validRecords.size() + " logs recientes válidos");
        return validRecords;
    }

    /**
     * Busca logs que contengan un término específico
     */
    public List<AuditLog> searchLogs(String searchTerm) {
        System.out.println("🔍 DEBUG: Buscando logs que contengan: " + searchTerm);

        try {
            // Intentar la búsqueda normal
            List<AuditLog> results = auditLogRepository.findLogsContaining(searchTerm);
            System.out.println("✅ DEBUG: Búsqueda normal exitosa, encontrados " + results.size() + " logs");
            return results;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Fallo en búsqueda de logs: " + e.getMessage());
            System.err.println("⚠️ WARN: La búsqueda puede contener registros con campos LOB problemáticos");
            // Por ahora retornar lista vacía, pero en el futuro se podría implementar
            // búsqueda segura
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Cuenta logs por acción
     */
    public Long countByAction(String action) {
        return auditLogRepository.countByAction(action);
    }

    /**
     * Cuenta logs por usuario
     */
    public Long countByUser(String performedBy) {
        return auditLogRepository.countByPerformedBy(performedBy);
    }

    /**
     * Limpia logs antiguos (solo para mantenimiento del sistema)
     * NOTA: Este método debe usarse con extrema precaución y solo por
     * administradores del sistema
     */
    @Transactional
    public void cleanupOldLogs(LocalDateTime cutoffDate) {
        // Solo permite eliminar logs muy antiguos para mantener rendimiento
        if (cutoffDate.isAfter(LocalDateTime.now().minusYears(2))) {
            throw new IllegalArgumentException("Solo se pueden eliminar logs con más de 2 años de antigüedad");
        }
        auditLogRepository.deleteByPerformedAtBefore(cutoffDate);
    }

    /**
     * Verifica la integridad de los registros de auditoría
     * Este método puede usarse para detectar posibles manipulaciones
     */
    public boolean verifyAuditIntegrity(Integer turnoId) {
        List<AuditLog> logs = getTurnoAuditHistory(turnoId);

        // Verificaciones básicas de integridad
        for (int i = 0; i < logs.size() - 1; i++) {
            AuditLog current = logs.get(i);
            AuditLog next = logs.get(i + 1);

            // Verificar que las fechas estén en orden
            if (current.getPerformedAt().isBefore(next.getPerformedAt())) {
                return false;
            }

            // Verificar coherencia de estados
            if (next.getEstadoNuevo() != null && current.getEstadoAnterior() != null &&
                    !next.getEstadoNuevo().equals(current.getEstadoAnterior())) {
                return false;
            }
        }

        return true;
    }

    /**
     * Obtiene estadísticas detalladas de turnos por estado y acción
     */
    public Map<String, Object> getDetailedTurnoStatistics() {
        System.out.println("🔍 DEBUG: Obteniendo estadísticas detalladas de turnos...");

        Map<String, Object> stats = new HashMap<>();

        // Contar turnos por acción específica
        Long confirmedCount = auditLogRepository.countByAction("CONFIRM");
        Long canceledCount = auditLogRepository.countByAction("CANCEL");
        Long rescheduledCount = auditLogRepository.countByAction("RESCHEDULE");
        Long statusChangedCount = auditLogRepository.countByAction("UPDATE_STATUS");
        Long createdCount = auditLogRepository.countByAction("CREATE");

        stats.put("turnosConfirmados", confirmedCount != null ? confirmedCount : 0);
        stats.put("turnosCancelados", canceledCount != null ? canceledCount : 0);
        stats.put("turnosReagendados", rescheduledCount != null ? rescheduledCount : 0);
        stats.put("turnosModificados", statusChangedCount != null ? statusChangedCount : 0);
        stats.put("turnosCreados", createdCount != null ? createdCount : 0);

        // Total de acciones
        stats.put("totalAcciones",
                (Long) stats.get("turnosConfirmados") +
                        (Long) stats.get("turnosCancelados") +
                        (Long) stats.get("turnosReagendados") +
                        (Long) stats.get("turnosModificados") +
                        (Long) stats.get("turnosCreados"));

        System.out.println("✅ DEBUG: Estadísticas detalladas calculadas: " + stats);
        return stats;
    }

    /**
     * Obtiene estadísticas de actividad por usuario
     */
    public List<Object[]> getUserActivityStatistics() {
        System.out.println("🔍 DEBUG: Obteniendo estadísticas de actividad por usuario...");
        List<Object[]> userStats = auditLogRepository.findUserActivityStatistics();
        System.out.println("✅ DEBUG: Estadísticas de usuario obtenidas: " + userStats.size() + " resultados");
        userStats.forEach(stat -> System.out.println("  - " + stat[0] + ": " + stat[1] + " acciones"));
        return userStats;
    }

    /**
     * Obtiene estadísticas combinadas para el dashboard
     */
    public Map<String, Object> getDashboardStatistics() {
        System.out.println("🔍 DEBUG: Obteniendo estadísticas del dashboard...");

        Map<String, Object> dashboardStats = new HashMap<>();

        // Estadísticas detalladas de turnos
        Map<String, Object> turnoStats = getDetailedTurnoStatistics();
        dashboardStats.putAll(turnoStats);

        // Estadísticas por acción (formato array para compatibilidad)
        List<Object[]> actionStats = getActionStatistics();
        dashboardStats.put("actionStatistics", actionStats);

        // Estadísticas por usuario
        List<Object[]> userStats = getUserActivityStatistics();
        dashboardStats.put("userStatistics", userStats);

        System.out.println("✅ DEBUG: Estadísticas del dashboard completadas");
        return dashboardStats;
    }

    /**
     * Método de debugging para verificar la estructura de la tabla de auditoría
     */
    public void debugAuditTableStructure() {
        try {
            System.out.println("🔍 DEBUG: Verificando estructura de la tabla audit_log...");
            List<Object[]> tableStructure = auditLogRepository.describeAuditLogTable();
            System.out.println("✅ DEBUG: Estructura de la tabla audit_log:");
            for (Object[] row : tableStructure) {
                System.out.println("  - " + java.util.Arrays.toString(row));
            }
        } catch (Exception e) {
            System.err.println("❌ ERROR: No se pudo obtener la estructura de la tabla: " + e.getMessage());
        }
    }

    /**
     * Método de debugging para contar registros de auditoría
     */
    public void debugAuditCount(Integer turnoId) {
        try {
            System.out.println("🔍 DEBUG: Contando registros de auditoría para turno " + turnoId + "...");
            Integer count = auditLogRepository.countAuditRecordsByTurno(turnoId);
            System.out.println("✅ DEBUG: Se encontraron " + count + " registros para el turno " + turnoId);
        } catch (Exception e) {
            System.err.println("❌ ERROR: No se pudo contar registros: " + e.getMessage());
        }
    }

    // ===============================
    // MÉTODOS DE AUDITORÍA DE ROLES Y USUARIOS
    // ===============================

    /**
     * Registra un cambio de rol de usuario
     */
    @Transactional
    public AuditLog logRoleChange(Long userId, String performedBy, String previousRole,
            String newRole, String reason) {
        System.out.println("🔍 DEBUG logRoleChange: Usuario ID: " + userId + ", Rol anterior: " +
                previousRole + ", Nuevo rol: " + newRole + ", Ejecutado por: " + performedBy);

        try {
            // Crear datos del cambio
            Map<String, Object> oldValues = new HashMap<>();
            oldValues.put("userId", userId);
            oldValues.put("role", previousRole);

            Map<String, Object> newValues = new HashMap<>();
            newValues.put("userId", userId);
            newValues.put("role", newRole);

            String oldValuesJson = objectMapper.writeValueAsString(oldValues);
            String newValuesJson = objectMapper.writeValueAsString(newValues);

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.USUARIO, userId, AuditLog.Actions.ROLE_CHANGE,
                    performedBy, previousRole, newRole, oldValuesJson, newValuesJson, reason);

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Cambio de rol auditado con ID: " + saved.getId());
            return saved;

        } catch (JsonProcessingException e) {
            System.err.println("❌ ERROR: Error al serializar datos de cambio de rol: " + e.getMessage());
            throw new RuntimeException("Error al serializar datos de cambio de rol", e);
        }
    }

    /**
     * Registra la creación de un nuevo usuario
     */
    @Transactional
    public AuditLog logUserCreated(Long userId, String userEmail, String userRole, String userNombre,
            String userApellido, String performedBy) {
        System.out.println("🔍 DEBUG logUserCreated: Usuario ID: " + userId + ", Email: " +
                userEmail + ", Rol: " + userRole + ", Creado por: " + performedBy);

        try {
            Map<String, Object> userData = new HashMap<>();
            userData.put("userId", userId);
            userData.put("email", userEmail);
            userData.put("role", userRole);
            userData.put("nombre", userNombre);
            userData.put("apellido", userApellido);
            userData.put("enabled", true);

            String userDataJson = objectMapper.writeValueAsString(userData);

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.USUARIO, userId, AuditLog.Actions.USER_CREATE,
                    performedBy, null, userRole, null, userDataJson,
                    "Usuario '" + userNombre + " " + userApellido + "' (" + userEmail + ") creado con rol " + userRole);

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Creación de usuario auditada con ID: " + saved.getId());
            return saved;

        } catch (JsonProcessingException e) {
            System.err.println("❌ ERROR: Error al serializar datos de creación de usuario: " + e.getMessage());
            throw new RuntimeException("Error al serializar datos de creación de usuario", e);
        }
    }

    /**
     * Registra cambios en datos de usuario
     */
    @Transactional
    public AuditLog logUserUpdated(Long userId, String performedBy, Object oldData, Object newData, String userNombre,
            String userApellido) {
        System.out.println("🔍 DEBUG logUserUpdated: Usuario ID: " + userId + ", Ejecutado por: " + performedBy);

        try {
            String oldDataJson = oldData != null ? objectMapper.writeValueAsString(oldData) : null;
            String newDataJson = newData != null ? objectMapper.writeValueAsString(newData) : null;

            String reason = String.format("Usuario '%s %s' actualizado", userNombre, userApellido);

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.USUARIO, userId, AuditLog.Actions.USER_UPDATE,
                    performedBy, null, null, oldDataJson, newDataJson, reason);

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Actualización de usuario auditada con ID: " + saved.getId());
            return saved;

        } catch (JsonProcessingException e) {
            System.err.println("❌ ERROR: Error al serializar datos de actualización de usuario: " + e.getMessage());
            throw new RuntimeException("Error al serializar datos de actualización de usuario", e);
        }
    }

    /**
     * Registra la habilitación/deshabilitación de un usuario
     */
    @Transactional
    public AuditLog logUserStatusChange(Long userId, String performedBy, boolean wasEnabled, boolean isEnabled,
            String userNombre, String userApellido) {
        String action = isEnabled ? AuditLog.Actions.USER_ENABLE : AuditLog.Actions.USER_DISABLE;
        String previousStatus = wasEnabled ? "ENABLED" : "DISABLED";
        String newStatus = isEnabled ? "ENABLED" : "DISABLED";

        System.out.println("🔍 DEBUG logUserStatusChange: Usuario ID: " + userId + ", Estado: " +
                previousStatus + " -> " + newStatus + ", Ejecutado por: " + performedBy);

        try {
            Map<String, Object> statusChange = new HashMap<>();
            statusChange.put("userId", userId);
            statusChange.put("enabled", isEnabled);

            String statusJson = objectMapper.writeValueAsString(statusChange);

            String reason = String.format("Usuario '%s %s' %s", userNombre, userApellido,
                    isEnabled ? "habilitado" : "deshabilitado");

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.USUARIO, userId, action,
                    performedBy, previousStatus, newStatus, null, statusJson, reason);

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Cambio de estado de usuario auditado con ID: " + saved.getId());
            return saved;

        } catch (JsonProcessingException e) {
            System.err.println("❌ ERROR: Error al serializar datos de cambio de estado: " + e.getMessage());
            throw new RuntimeException("Error al serializar datos de cambio de estado", e);
        }
    }

    /**
     * Obtiene el historial de auditoría de un usuario específico
     */
    public List<AuditLog> getUserAuditHistory(Long userId) {
        System.out.println("🔍 DEBUG: Obteniendo historial de auditoría para usuario ID: " + userId);
        try {
            return auditLogRepository.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(
                    AuditLog.EntityTypes.USUARIO, userId);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener historial de usuario: " + e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene todos los cambios de rol del sistema
     */
    public List<AuditLog> getAllRoleChanges() {
        System.out.println("🔍 DEBUG: Obteniendo todos los cambios de rol del sistema");
        try {
            return auditLogRepository.findByEntityTypeAndActionOrderByPerformedAtDesc(
                    AuditLog.EntityTypes.USUARIO, AuditLog.Actions.ROLE_CHANGE);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener historial de cambios de rol: " + e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene cambios de rol por usuario específico
     */
    public List<AuditLog> getRoleChangesByUser(Long userId) {
        System.out.println("🔍 DEBUG: Obteniendo cambios de rol para usuario ID: " + userId);
        try {
            return auditLogRepository.findByEntityTypeAndEntityIdAndActionOrderByPerformedAtDesc(
                    AuditLog.EntityTypes.USUARIO, userId, AuditLog.Actions.ROLE_CHANGE);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener cambios de rol del usuario: " + e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene estadísticas de cambios de rol
     */
    public Map<String, Object> getRoleChangeStatistics() {
        System.out.println("🔍 DEBUG: Obteniendo estadísticas de cambios de rol");
        try {
            List<Object[]> roleStats = auditLogRepository.findRoleChangeStatistics();
            Map<String, Object> statistics = new HashMap<>();
            statistics.put("roleChanges", roleStats);
            statistics.put("totalChanges", getAllRoleChanges().size());

            // Contar cambios por rol destino
            Map<String, Long> changesByNewRole = new HashMap<>();
            Map<String, Long> changesByPreviousRole = new HashMap<>();

            for (Object[] stat : roleStats) {
                String previousRole = (String) stat[0];
                String newRole = (String) stat[1];
                Long count = (Long) stat[2];

                changesByPreviousRole.put(previousRole != null ? previousRole : "NINGUNO",
                        changesByPreviousRole.getOrDefault(previousRole, 0L) + count);
                changesByNewRole.put(newRole,
                        changesByNewRole.getOrDefault(newRole, 0L) + count);
            }

            statistics.put("changesByNewRole", changesByNewRole);
            statistics.put("changesByPreviousRole", changesByPreviousRole);

            return statistics;
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener estadísticas de cambios de rol: " + e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * Obtiene cambios de rol recientes
     */
    public List<AuditLog> getRecentRoleChanges(LocalDateTime since) {
        System.out.println("🔍 DEBUG: Obteniendo cambios de rol desde: " + since);
        try {
            return auditLogRepository.findRecentRoleChanges(since);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener cambios de rol recientes: " + e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene logs de creación de usuarios
     */
    public List<AuditLog> getUserCreationLogs() {
        System.out.println("🔍 DEBUG: Obteniendo logs de creación de usuarios");
        try {
            return auditLogRepository.findUserCreationLogs();
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener logs de creación de usuarios: " + e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Obtiene resumen de actividad de usuarios
     */
    public Map<String, Object> getUserActivitySummary() {
        System.out.println("🔍 DEBUG: Obteniendo resumen de actividad de usuarios");
        try {
            List<Object[]> activitySummary = auditLogRepository.findUserActivitySummary();
            Map<String, Object> summary = new HashMap<>();
            summary.put("activityByAction", activitySummary);

            // Estadísticas adicionales
            summary.put("totalUserActions", activitySummary.stream()
                    .mapToLong(row -> (Long) row[1]).sum());
            summary.put("uniqueActions", activitySummary.size());

            return summary;
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener resumen de actividad de usuarios: " + e.getMessage());
            return new HashMap<>();
        }
    }

    /**
     * Busca logs por tipo de entidad y acción
     */
    public List<AuditLog> getLogsByEntityTypeAndAction(String entityType, String action) {
        System.out.println("🔍 DEBUG: Obteniendo logs para entidad: " + entityType + ", acción: " + action);
        try {
            return auditLogRepository.findByEntityTypeAndActionOrderByPerformedAtDesc(entityType, action);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al obtener logs por entidad y acción: " + e.getMessage());
            return new java.util.ArrayList<>();
        }
    }

    /**
     * Registra activación de cuenta
     */
    @Transactional
    public AuditLog logAccountActivation(Long userId, String userEmail, String activationType, String reason) {
        System.out.println("🔍 DEBUG logAccountActivation: Usuario ID: " + userId + ", Email: " + userEmail +
                ", Tipo: " + activationType + ", Ejecutado por: " + userEmail);

        try {
            Map<String, Object> activationData = new HashMap<>();
            activationData.put("userId", userId);
            activationData.put("activationType", activationType); // "EMAIL_VERIFICATION", "ADMIN_ACTIVATION"
            activationData.put("timestamp", LocalDateTime.now());

            String activationJson = objectMapper.writeValueAsString(activationData);

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.USUARIO, userId, AuditLog.Actions.USER_UPDATE,
                    userEmail, "No verificado", "Cuenta activada", null, activationJson, reason);

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Activación de cuenta auditada con ID: " + saved.getId());
            return saved;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al auditar activación de cuenta: " + e.getMessage());
            throw new RuntimeException("Error al registrar auditoría de activación de cuenta", e);
        }
    }

    /**
     * Registra cambios de contraseña
     */
    @Transactional
    public AuditLog logPasswordChange(Long userId, String userEmail, String changeType, String reason) {
        System.out.println("🔍 DEBUG logPasswordChange: Usuario ID: " + userId + ", Email: " + userEmail +
                ", Tipo: " + changeType + ", Ejecutado por: " + userEmail);

        try {
            Map<String, Object> passwordChange = new HashMap<>();
            passwordChange.put("userId", userId);
            passwordChange.put("changeType", changeType); // "PROFILE_CHANGE", "FORGOT_PASSWORD", "ADMIN_RESET"
            passwordChange.put("timestamp", LocalDateTime.now());

            String changeJson = objectMapper.writeValueAsString(passwordChange);

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.USUARIO, userId, AuditLog.Actions.USER_UPDATE,
                    userEmail, null, "PASSWORD_UPDATED", null, changeJson, reason);

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Cambio de contraseña auditado con ID: " + saved.getId());
            return saved;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al auditar cambio de contraseña: " + e.getMessage());
            throw new RuntimeException("Error al registrar auditoría de cambio de contraseña", e);
        }
    }

    /**
     * Registra la creación del administrador inicial del sistema
     * Este método específico documenta que fue creado automáticamente por el seed
     * inicial
     */
    @Transactional
    public AuditLog logAdminInitialCreation(Long userId, String adminEmail, Long adminDni) {
        System.out.println("🔍 DEBUG logAdminInitialCreation: Admin ID: " + userId + ", Email: " + adminEmail);

        try {
            Map<String, Object> adminData = new HashMap<>();
            adminData.put("email", adminEmail);
            adminData.put("dni", adminDni);
            adminData.put("role", "ADMINISTRADOR");
            adminData.put("mustChangePassword", true);
            adminData.put("firstLogin", true);
            adminData.put("createdBy", "SYSTEM_SEED");
            adminData.put("createdAt", LocalDateTime.now().toString());

            String adminDataJson = objectMapper.writeValueAsString(adminData);

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.USUARIO, userId, AuditLog.Actions.USER_CREATE,
                    "SYSTEM_SEED", null, "ADMIN_INITIAL_CREATED",
                    null, adminDataJson, "Creación automática del administrador inicial del sistema");

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Administrador inicial auditado con ID: " + saved.getId());
            return saved;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al auditar creación del administrador inicial: " + e.getMessage());
            throw new RuntimeException("Error al registrar auditoría de administrador inicial", e);
        }
    }

    /**
     * Registra cancelación automática de turno
     * 
     * @param turnoId    ID del turno cancelado
     * @param pacienteId ID del paciente afectado
     * @param motivo     Motivo de la cancelación automática
     * @return AuditLog registro de auditoría creado
     */
    @Transactional
    public AuditLog logTurnoCancelledAutomatically(Long turnoId, Long pacienteId, String motivo) {
        try {
            System.out.println("🔍 AUDIT: Registrando cancelación automática de turno ID: " + turnoId);

            // Usar el constructor genérico de AuditLog que existe en la entidad
            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.TURNO, // entityType
                    turnoId, // entityId
                    "CANCELLED_AUTO", // action
                    "SYSTEM_AUTO_CANCELLATION", // performedBy
                    "PROGRAMADO", // previousStatus
                    "CANCELADO", // newStatus
                    "estado=PROGRAMADO", // oldValues
                    "estado=CANCELADO, motivo=" + motivo, // newValues
                    motivo // reason
            );

            AuditLog saved = auditLogRepository.save(auditLog);

            System.out.println(
                    "✅ AUDIT: Cancelación automática de turno registrada exitosamente. ID Audit: " + saved.getId());
            return saved;

        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al auditar cancelación automática de turno: " + e.getMessage());
            throw new RuntimeException("Error al registrar auditoría de cancelación automática", e);
        }
    }

    // ===============================
    // MÉTODOS GENÉRICOS PARA AUDITORÍA DE CUALQUIER ENTIDAD
    // ===============================

    /**
     * Registra una acción genérica de auditoría para cualquier entidad
     */
    @Transactional
    public AuditLog logGenericAction(String entityType, Long entityId, String action,
            String performedBy, String estadoAnterior, String estadoNuevo,
            Object oldValues, Object newValues, String reason) {
        // TODO: BUG - Verificar serialización de newValues. Actualmente se guarda
        // hashCode (ej. 29534) en lugar de JSON.
        // Posibles causas: Columna DB es INTEGER en lugar de TEXT/JSON, o problema en
        // mapeo JPA.
        // Solución: Asegurar que columna sea TEXT y que ObjectMapper serialice
        // correctamente el Map.
        try {
            String oldValuesJson = oldValues != null ? objectMapper.writeValueAsString(oldValues) : null;
            String newValuesJson = newValues != null ? objectMapper.writeValueAsString(newValues) : null;

            AuditLog auditLog = new AuditLog(entityType, entityId, action, performedBy,
                    estadoAnterior, estadoNuevo, oldValuesJson, newValuesJson, reason);
            return auditLogRepository.save(auditLog);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Error al serializar datos de auditoría", e);
        }
    }

    // ===============================
    // MÉTODOS ESPECÍFICOS PARA AUDITORÍA DE OTRAS ENTIDADES
    // ===============================

    /**
     * Registra la creación de un consultorio
     */
    @Transactional
    public AuditLog logConsultorioCreated(Long consultorioId, String nombre, Long centroId, String performedBy) {
        try {
            // Obtener nombre del centro para motivo más descriptivo
            String centroNombre = centroAtencionService.findEntityById(centroId.intValue()).getNombre();

            Map<String, Object> consultorioData = Map.of(
                    "id", consultorioId,
                    "nombre", nombre,
                    "centroId", centroId,
                    "centroNombre", centroNombre);
            return logGenericAction(AuditLog.EntityTypes.CONSULTORIO, consultorioId,
                    AuditLog.Actions.CREATE, performedBy, null, "ACTIVO",
                    null, consultorioData, "Consultorio '" + nombre + "' creado en " + centroNombre);
        } catch (Exception e) {
            throw new RuntimeException("Error al auditar creación de consultorio", e);
        }
    }

    /**
     * Registra un cambio en una configuración del sistema
     * 
     * @param clave       La clave de la config (e.g., "turnos.dias_max_no_confirm")
     * @param oldValue    Valor anterior (opcional, null si no se conoce)
     * @param nuevoValor  Nuevo valor
     * @param performedBy Usuario que realizó el cambio (email o username)
     */
    @Transactional
    public AuditLog logConfigChange(String clave, Object oldValue, Object nuevoValor, String performedBy) {
        System.out.println("🔍 DEBUG logConfigChange: Clave: " + clave + ", OldValue: " + oldValue +
                ", NuevoValor: " + nuevoValor + ", Usuario: " + performedBy);

        try {
            // Serializar valores
            String oldValueJson = oldValue != null ? objectMapper.writeValueAsString(oldValue) : null;
            // String newValueJson = nuevoValor != null ?
            // objectMapper.writeValueAsString(nuevoValor) : null;

            // Mapa con detalles para newValues
            Map<String, Object> changeData = new HashMap<>();
            changeData.put("clave", clave);
            changeData.put("nuevoValor", nuevoValor);
            changeData.put("timestamp", LocalDateTime.now());
            String changeJson = objectMapper.writeValueAsString(changeData);

            // Usar hashCode de clave como entityId (Long)
            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.CONFIGURACION, // Usa el tipo existente
                    (long) clave.hashCode(), // entityId como hash de la clave
                    AuditLog.Actions.MODIFY, // Usa MODIFY (o agrega CONFIG_UPDATE si prefieres)
                    performedBy,
                    null, // previousStatus no aplica
                    null, // newStatus no aplica
                    oldValueJson,
                    changeJson,
                    "Cambio de configuración: " + clave);

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Cambio de config auditado con ID: " + saved.getId());
            return saved;

        } catch (JsonProcessingException e) {
            System.err.println("❌ ERROR: Error al serializar cambio de config: " + e.getMessage());
            throw new RuntimeException("Error al serializar datos de auditoría de config", e);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al auditar cambio de config: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Registra la actualización de un consultorio
     */
    public AuditLog logConsultorioUpdated(Long consultorioId, String performedBy,
            Object oldData, Object newData, String reason) {
        return logGenericAction(AuditLog.EntityTypes.CONSULTORIO, consultorioId,
                AuditLog.Actions.UPDATE, performedBy, null, null,
                oldData, newData, reason != null ? reason : "Consultorio actualizado");
    }

    /**
     * Registra la eliminación de un consultorio
     */
    @Transactional
    public AuditLog logConsultorioDeleted(Long consultorioId, String performedBy, String reason) {
        return logGenericAction(AuditLog.EntityTypes.CONSULTORIO, consultorioId,
                AuditLog.Actions.DELETE, performedBy, "ACTIVO", "ELIMINADO",
                null, null, reason != null ? reason : "Consultorio eliminado");
    }

    /**
     * Registra la creación de un centro de atención
     */
    @Transactional
    public AuditLog logCentroAtencionCreated(Long centroId, String nombre, String performedBy) {
        try {
            Map<String, Object> centroData = Map.of(
                    "id", centroId,
                    "nombre", nombre);
            return logGenericAction(AuditLog.EntityTypes.CENTRO_ATENCION, centroId,
                    AuditLog.Actions.CREATE, performedBy, null, "ACTIVO",
                    null, centroData, "Centro de atención creado");
        } catch (Exception e) {
            throw new RuntimeException("Error al auditar creación de centro de atención", e);
        }
    }

    /**
     * Registra restauración de configuraciones a valores por defecto
     */

    public AuditLog logConfigResetToDefaults(String performedBy) {
        System.out.println("🔍 DEBUG logConfigResetToDefaults: Usuario: " + performedBy);

        try {
            Map<String, Object> resetData = new HashMap<>();
            resetData.put("action", "reset_to_defaults");
            resetData.put("timestamp", LocalDateTime.now());
            String resetJson = objectMapper.writeValueAsString(resetData);

            AuditLog auditLog = new AuditLog(
                    AuditLog.EntityTypes.CONFIGURACION,
                    0L, // entityId 0 para reset general
                    AuditLog.Actions.MODIFY,
                    performedBy,
                    null,
                    null,
                    null,
                    resetJson,
                    "Restauración de configuraciones a valores por defecto");

            AuditLog saved = auditLogRepository.save(auditLog);
            System.out.println("✅ DEBUG: Reset de configs auditado con ID: " + saved.getId());
            return saved;

        } catch (JsonProcessingException e) {
            System.err.println("❌ ERROR: Error al serializar reset de configs: " + e.getMessage());
            throw new RuntimeException("Error al serializar datos de auditoría de reset", e);
        } catch (Exception e) {
            System.err.println("❌ ERROR: Error al auditar reset de configs: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Registra la actualización de un centro de atención
     */
    public AuditLog logCentroAtencionUpdated(Long centroId, String performedBy,
            Object oldData, Object newData, String reason) {
        return logGenericAction(AuditLog.EntityTypes.CENTRO_ATENCION, centroId,
                AuditLog.Actions.UPDATE, performedBy, null, null,
                oldData, newData, reason != null ? reason : "Centro de atención actualizado");
    }

    /**
     * Registra la creación de una especialidad
     */
    @Transactional
    public AuditLog logEspecialidadCreated(Long especialidadId, String nombre, String performedBy) {
        try {
            Map<String, Object> especialidadData = Map.of(
                    "id", especialidadId,
                    "nombre", nombre);
            return logGenericAction(AuditLog.EntityTypes.ESPECIALIDAD, especialidadId,
                    AuditLog.Actions.CREATE, performedBy, null, "ACTIVA",
                    null, especialidadData, "Especialidad '" + nombre + "' creada");
        } catch (Exception e) {
            throw new RuntimeException("Error al auditar creación de especialidad", e);
        }
    }

    /**
     * Registra la creación de un médico
     */
    @Transactional
    public AuditLog logMedicoCreated(Long medicoId, String nombre, String apellido, String performedBy) {
        try {
            Map<String, Object> medicoData = Map.of(
                    "id", medicoId,
                    "nombre", nombre,
                    "apellido", apellido);
            return logGenericAction(AuditLog.EntityTypes.MEDICO, medicoId,
                    AuditLog.Actions.CREATE, performedBy, null, "ACTIVO",
                    null, medicoData, "Médico creado");
        } catch (Exception e) {
            throw new RuntimeException("Error al auditar creación de médico", e);
        }
    }

    /**
     * Registra la creación de un paciente
     */
    @Transactional
    public AuditLog logPacienteCreated(Long pacienteId, String nombre, String apellido, String performedBy) {
        try {
            Map<String, Object> pacienteData = Map.of(
                    "id", pacienteId,
                    "nombre", nombre,
                    "apellido", apellido);
            return logGenericAction(AuditLog.EntityTypes.PACIENTE, pacienteId,
                    AuditLog.Actions.CREATE, performedBy, null, "ACTIVO",
                    null, pacienteData, "Paciente creado");
        } catch (Exception e) {
            throw new RuntimeException("Error al auditar creación de paciente", e);
        }
    }

    /**
     * Registra la creación de un operador
     */
    @Transactional
    public AuditLog logOperadorCreated(Long operadorId, String nombre, String apellido, String performedBy) {
        try {
            Map<String, Object> operadorData = Map.of(
                    "id", operadorId,
                    "nombre", nombre,
                    "apellido", apellido);
            return logGenericAction(AuditLog.EntityTypes.OPERADOR, operadorId,
                    AuditLog.Actions.CREATE, performedBy, null, "ACTIVO",
                    null, operadorData, "Operador creado");
        } catch (Exception e) {
            throw new RuntimeException("Error al auditar creación de operador", e);
        }
    }

    /**
     * Registra login de usuario
     */
    @Transactional
    public AuditLog logUserLogin(String username, String performedBy) {
        return logGenericAction(AuditLog.EntityTypes.USUARIO, null,
                AuditLog.Actions.LOGIN, performedBy, null, "LOGGED_IN",
                null, Map.of("username", username), "Usuario inició sesión");
    }

    /**
     * Registra logout de usuario
     */
    @Transactional
    public AuditLog logUserLogout(String username, String performedBy) {
        return logGenericAction(AuditLog.EntityTypes.USUARIO, null,
                AuditLog.Actions.LOGOUT, performedBy, "LOGGED_IN", "LOGGED_OUT",
                null, Map.of("username", username), "Usuario cerró sesión");
    }

    /**
     * Registra cambio de contraseña
     */
    @Transactional
    public AuditLog logPasswordChange(Long userId, String performedBy, String reason) {
        return logGenericAction(AuditLog.EntityTypes.USUARIO, userId,
                AuditLog.Actions.PASSWORD_CHANGE, performedBy, null, null,
                null, null, reason != null ? reason : "Contraseña cambiada");
    }

    // ===============================
    // MÉTODOS PARA OBTENER HISTORIALES GENÉRICOS
    // ===============================

    /**
     * Obtiene el historial de auditoría de una entidad específica
     */
    public List<AuditLog> getEntityAuditHistory(String entityType, Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(entityType, entityId);
    }

    /**
     * Obtiene el historial de auditoría de un tipo de entidad
     */
    public List<AuditLog> getEntityTypeAuditHistory(String entityType) {
        return auditLogRepository.findByEntityTypeOrderByPerformedAtDesc(entityType);
    }

    /**
     * Obtiene logs por tipo de entidad en un rango de fechas
     */
    public List<AuditLog> getLogsByEntityTypeAndDateRange(String entityType, LocalDateTime start, LocalDateTime end) {
        return auditLogRepository.findByEntityTypeAndPerformedAtBetweenOrderByPerformedAtDesc(entityType, start, end);
    }

    /**
     * Obtiene logs por tipo de entidad y usuario
     */
    public List<AuditLog> getLogsByEntityTypeAndUser(String entityType, String performedBy) {
        return auditLogRepository.findByEntityTypeAndPerformedByOrderByPerformedAtDesc(entityType, performedBy);
    }

    /**
     * Obtiene estadísticas por tipo de entidad
     */
    public List<Object[]> getEntityTypeStatistics() {
        return auditLogRepository.findEntityTypeStatistics();
    }

    /**
     * Obtiene estadísticas de acciones por tipo de entidad
     */
    public List<Object[]> getActionStatisticsByEntityType() {
        return auditLogRepository.findActionStatisticsByEntityType();
    }

    /**
     * Cuenta logs por tipo de entidad
     */
    public Long countByEntityType(String entityType) {
        return auditLogRepository.countByEntityType(entityType);
    }

    /**
     * Cuenta logs por tipo de entidad y acción
     */
    public Long countByEntityTypeAndAction(String entityType, String action) {
        return auditLogRepository.countByEntityTypeAndAction(entityType, action);
    }

    /**
     * Busca logs de auditoría con filtros avanzados, paginación y ordenamiento
     */
    public Page<AuditLog> findByFilters(String entidad, String usuario, String tipoAccion,
            LocalDate fechaDesde, LocalDate fechaHasta,
            int page, int size, String sortBy, String sortDir) {
        // Convertir LocalDate a LocalDateTime para el rango completo del día
        LocalDateTime fechaDesdeFilter = fechaDesde != null ? fechaDesde.atStartOfDay()
                : LocalDateTime.of(1900, 1, 1, 0, 0);
        LocalDateTime fechaHastaFilter = fechaHasta != null ? fechaHasta.atTime(23, 59, 59, 999999999)
                : LocalDateTime.of(2100, 1, 1, 0, 0);

        // Crear ordenamiento dinámico
        Sort.Direction direction = sortDir.equalsIgnoreCase("ASC") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Sort sort = Sort.by(direction, sortBy);

        // Crear paginación con ordenamiento
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<Object[]> resultPage = auditLogRepository.findByFilters(entidad, usuario, tipoAccion,
                fechaDesdeFilter, fechaHastaFilter, pageable);

        // Convertir Object[] a AuditLog
        List<AuditLog> auditLogs = resultPage.getContent().stream()
                .map(this::convertObjectArrayToAuditLog)
                .collect(Collectors.toList());

        return new PageImpl<>(auditLogs, pageable, resultPage.getTotalElements());
    }

    /**
     * Convierte un Object[] a AuditLog, evitando campos LOB problemáticos
     */
    private AuditLog convertObjectArrayToAuditLog(Object[] data) {
        AuditLog auditLog = new AuditLog();
        auditLog.setId((Integer) data[0]);

        // data[1] es ahora a.turno.id (Integer), no el objeto Turno
        Integer turnoId = (Integer) data[1];
        if (turnoId != null) {
            // Si necesitamos el objeto Turno, tendríamos que buscarlo, pero por ahora lo
            // dejamos como null
            // auditLog.setTurno(turnoRepository.findById(turnoId).orElse(null));
        }

        auditLog.setEntityType((String) data[2]);
        auditLog.setEntityId(data[3] != null ? ((Number) data[3]).longValue() : null);
        auditLog.setAction((String) data[4]);
        auditLog.setPerformedAt((LocalDateTime) data[5]);
        auditLog.setPerformedBy((String) data[6]);
        auditLog.setEstadoAnterior((String) data[7]);
        auditLog.setEstadoNuevo((String) data[8]);
        auditLog.setReason((String) data[9]);
        // No incluimos oldValues y newValues para evitar problemas con LOB
        return auditLog;
    }

    /**
     * Obtiene estadísticas de auditoría agrupadas por tipo de entidad
     */
    public List<Map<String, Object>> getEntityAuditStatistics() {
        List<Object[]> results = auditLogRepository.getAuditStatisticsByEntityType();
        List<Map<String, Object>> statistics = new ArrayList<>();

        for (Object[] result : results) {
            Map<String, Object> stat = new HashMap<>();
            stat.put("entityType", result[0]);
            stat.put("totalLogs", result[1]);
            stat.put("createCount", result[2]);
            stat.put("updateCount", result[3]);
            stat.put("deleteCount", result[4]);
            stat.put("lastActivity", result[5]);
            statistics.add(stat);
        }

        return statistics;
    }

    /**
     * MÉTODO DE DIAGNÓSTICO: Verifica todos los logs de auditoría de un turno
     * específico
     */
    public void diagnosticTurnoAuditLogs(Integer turnoId) {
        try {
            System.out.println("🔍 DIAGNÓSTICO: Verificando logs de auditoría para turno ID: " + turnoId);

            // Obtener todos los logs del turno usando el método existente
            List<AuditLog> turnoLogs = auditLogRepository
                    .findByEntityTypeAndEntityId("TURNO", turnoId.longValue(), Pageable.unpaged()).getContent();

            System.out.println("📊 Total de logs encontrados: " + turnoLogs.size());

            for (AuditLog log : turnoLogs) {
                System.out.println("  📝 LOG ID: " + log.getId());
                System.out.println("     Acción: " + log.getAction());
                System.out.println("     Usuario: " + log.getPerformedBy());
                System.out.println("     Estado Anterior: " + log.getEstadoAnterior());
                System.out.println("     Estado Nuevo: " + log.getEstadoNuevo());
                System.out.println("     Motivo: " + log.getReason());
                System.out.println("     Fecha: " + log.getPerformedAt());
                System.out.println("     ---");
            }

            // Verificar estadísticas por acción para TURNO
            List<Object[]> actionStats = auditLogRepository.findActionStatistics();
            System.out.println("📈 Estadísticas de acciones globales:");
            for (Object[] stat : actionStats) {
                System.out.println("  " + stat[0] + ": " + stat[1] + " registros");
            }

        } catch (Exception e) {
            System.err.println("❌ ERROR en diagnóstico: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /*
     * *
     * 
     * Obtiene historial
     * de cambios
     * para una
     * clave específica (paginado)
     */
    public List<AuditLog> getConfigChangeHistory(String clave, int page, int size) {
        System.out.println("🔍 DEBUG getConfigChangeHistory: Clave: " + clave + ", Page: " + page + ", Size: " + size);
        Pageable pageable = PageRequest.of(page, size);
        Page<AuditLog> history = auditLogRepository.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(
                AuditLog.EntityTypes.CONFIGURACION, (long) clave.hashCode(), pageable);
        return history.getContent();
    }

    /**
     * Obtiene la última modificación de configs (para UI)
     */
    @Transactional(readOnly = true)
    public AuditLog getUltimaModificacionConfig() {
        System.out.println("🔍 DEBUG getUltimaModificacionConfig");
        Optional<AuditLog> lastLog = auditLogRepository.findTopByEntityTypeOrderByPerformedAtDesc(
                AuditLog.EntityTypes.CONFIGURACION);
        if (lastLog.isPresent()) {
            System.out.println("✅ DEBUG: Última mod encontrada, ID: " + lastLog.get().getId());
            return lastLog.get();
        }
        System.out.println("⚠️ DEBUG: No hay modificaciones de config registradas");
        return null;
    }

}
