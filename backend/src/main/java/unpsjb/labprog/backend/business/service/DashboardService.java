package unpsjb.labprog.backend.business.service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import unpsjb.labprog.backend.business.repository.ConsultorioRepository;
import unpsjb.labprog.backend.business.repository.TurnoRepository;
import unpsjb.labprog.backend.business.repository.EncuestaRespuestaRepository;
import unpsjb.labprog.backend.business.repository.AuditLogRepository;
import unpsjb.labprog.backend.business.repository.ListaEsperaRepository;
import unpsjb.labprog.backend.dto.FiltrosDashboardDTO;
import unpsjb.labprog.backend.dto.MetricasDashboardDTO;
import unpsjb.labprog.backend.dto.OcupacionConsultorioDTO;
import unpsjb.labprog.backend.model.AuditLog;
import unpsjb.labprog.backend.model.Consultorio;
import unpsjb.labprog.backend.model.Turno;
import unpsjb.labprog.backend.model.EstadoTurno;
import unpsjb.labprog.backend.model.TipoPregunta;

@Service
public class DashboardService {

    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private ConsultorioRepository consultorioRepository;

    @Autowired
    private EncuestaRespuestaRepository encuestaRespuestaRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ListaEsperaRepository listaEsperaRepository;

    /**
     * Calcula métricas básicas (conteos y tasas) aplicando filtros de fechas y
     * entidades
     */
    public MetricasDashboardDTO getMetricasBasicas(FiltrosDashboardDTO filtros) {
        MetricasDashboardDTO dto = new MetricasDashboardDTO();

        LocalDate desde = filtros != null ? filtros.getFechaDesde() : null;
        LocalDate hasta = filtros != null ? filtros.getFechaHasta() : null;

        // Construir specification usando TurnoRepository.buildSpecification
        var spec = TurnoRepository.buildSpecification(
                null,
                null,
                filtros != null ? filtros.getStaffMedicoId() : null,
                filtros != null ? filtros.getEspecialidadId() : null,
                filtros != null ? filtros.getCentroId() : null,
                filtros != null ? filtros.getConsultorioId() : null,
                desde,
                hasta,
                null,
                null,
                null,
                null,
                null);

        List<Turno> turnos = turnoRepository.findAll(spec);

        long total = turnos.size();

        Map<String, Long> porEstado = turnos.stream()
                .collect(Collectors.groupingBy(t -> t.getEstado().name(), Collectors.counting()));

        long completos = porEstado.getOrDefault(EstadoTurno.COMPLETO.name(), 0L);
        long ausentes = porEstado.getOrDefault(EstadoTurno.AUSENTE.name(), 0L);
        long cancelados = porEstado.getOrDefault(EstadoTurno.CANCELADO.name(), 0L);
        long confirmados = porEstado.getOrDefault(EstadoTurno.CONFIRMADO.name(), 0L);
        long programados = porEstado.getOrDefault(EstadoTurno.PROGRAMADO.name(), 0L);

        dto.setTotalTurnos(total);
        dto.setTurnosPorEstado(porEstado);

        // Tasas defensivas
        dto.setTasaAsistencia(percentSafe(completos, completos + ausentes));
        dto.setPorcentajeAusentismo(percentSafe(ausentes, completos + ausentes));
        dto.setPorcentajeCancelaciones(percentSafe(cancelados, total));
        dto.setConfirmadosVsProgramados(percentSafe(confirmados, confirmados + programados));

        // Turnos sin consultorio en el rango
        int sinConsultorio = (int) turnos.stream().filter(t -> t.getConsultorio() == null).count();
        dto.setTurnosSinConsultorio(sinConsultorio);

        // Eficiencia de asignación: % de turnos futuros en rango que ya tienen
        // consultorio
        LocalDate hoy = LocalDate.now();
        List<Turno> futuros = turnos.stream().filter(t -> t.getFecha() != null && !t.getFecha().isBefore(hoy))
                .collect(Collectors.toList());
        long totalFuturos = futuros.size();
        long asignados = futuros.stream().filter(t -> t.getConsultorio() != null).count();
        dto.setEficienciaAsignacion(percentSafe(asignados, totalFuturos));

        return dto;
    }

    /**
     * Calcula métricas de ocupación por consultorio en el rango de fechas
     */
    public MetricasDashboardDTO getMetricasOcupacion(FiltrosDashboardDTO filtros) {
        MetricasDashboardDTO dto = new MetricasDashboardDTO();

        LocalDate desde = filtros != null ? filtros.getFechaDesde() : null;
        LocalDate hasta = filtros != null ? filtros.getFechaHasta() : null;

        // Si no vienen fechas, usar último mes como default
        if (desde == null && hasta == null) {
            hasta = LocalDate.now();
            desde = hasta.minusDays(30);
        } else if (desde == null) {
            desde = hasta.minusDays(30);
        } else if (hasta == null) {
            hasta = desde.plusDays(30);
        }

        List<Consultorio> consultorios;
        if (filtros != null && filtros.getConsultorioId() != null) {
            consultorios = consultorioRepository.findById(filtros.getConsultorioId()).map(List::of).orElse(List.of());
        } else if (filtros != null && filtros.getCentroId() != null) {
            consultorios = consultorioRepository.findByCentroAtencionId(filtros.getCentroId());
        } else {
            consultorios = consultorioRepository.findAll();
        }

        Map<Integer, Double> ocupacionMap = new HashMap<>();
        List<OcupacionConsultorioDTO> ocupacionDetallada = new ArrayList<>();

        // Obtener todos los turnos en el rango para eficiencia
        var spec = TurnoRepository.buildSpecification(
                null, null, null, null,
                filtros != null ? filtros.getCentroId() : null,
                filtros != null ? filtros.getConsultorioId() : null,
                desde, hasta, null, null, null, null, null);

        List<Turno> turnos = turnoRepository.findAll(spec);

        for (Consultorio c : consultorios) {
            // Turnos del consultorio
            List<Turno> turnosC = turnos.stream().filter(t -> t.getConsultorio() != null &&
                    t.getConsultorio().getId().equals(c.getId())).collect(Collectors.toList());

            long minutosOcupados = 0;
            for (Turno t : turnosC) {
                if (t.getHoraInicio() != null && t.getHoraFin() != null) {
                    minutosOcupados += ChronoUnit.MINUTES.between(t.getHoraInicio(), t.getHoraFin());
                }
            }

            long minutosDisponibles = calcularMinutosDisponiblesConsultorio(c, desde, hasta);

            double porcentaje = minutosDisponibles > 0 ? ((double) minutosOcupados / minutosDisponibles) * 100.0 : 0.0;
            if (porcentaje < 0)
                porcentaje = 0.0;
            if (porcentaje > 100.0)
                porcentaje = 100.0;

            ocupacionMap.put(c.getId(), porcentaje);

            // Crear DTO detallado
            OcupacionConsultorioDTO ocupacionDTO = new OcupacionConsultorioDTO();
            ocupacionDTO.setConsultorioId(c.getId());
            ocupacionDTO.setConsultorioNombre(c.getNombre());
            ocupacionDTO.setConsultorioNumero(c.getNumero());
            ocupacionDTO.setPorcentajeOcupacion(porcentaje);
            if (c.getCentroAtencion() != null) {
                ocupacionDTO.setCentroAtencionId(c.getCentroAtencion().getId());
                ocupacionDTO.setCentroAtencionNombre(c.getCentroAtencion().getNombre());
            }
            ocupacionDetallada.add(ocupacionDTO);
        }

        dto.setOcupacionPorConsultorio(ocupacionMap);
        dto.setOcupacionDetallada(ocupacionDetallada);

        // Eficiencia de asignación: % de turnos futuros sin consultorio asignado
        LocalDate hoy = LocalDate.now();
        long futurosTotal = turnos.stream().filter(t -> t.getFecha() != null && !t.getFecha().isBefore(hoy)).count();
        long futurosAsignados = turnos.stream()
                .filter(t -> t.getFecha() != null && !t.getFecha().isBefore(hoy) && t.getConsultorio() != null).count();
        dto.setEficienciaAsignacion(percentSafe(futurosAsignados, futurosTotal));

        return dto;
    }

    private double percentSafe(long numerator, long denominator) {
        if (denominator <= 0)
            return 0.0;
        return ((double) numerator / (double) denominator) * 100.0;
    }

    /**
     * Calcula minutos disponibles en el consultorio entre dos fechas usando sus
     * horarios semanales.
     * Si no hay horarios configurados, asume 8 horas (480 minutos) por día como
     * fallback.
     */
    private long calcularMinutosDisponiblesConsultorio(Consultorio consultorio, LocalDate desde, LocalDate hasta) {
        if (consultorio == null || desde == null || hasta == null)
            return 0;

        long total = 0;
        long fallbackMinutes = 480;
        LocalDate d = desde;
        while (!d.isAfter(hasta)) {
            DayOfWeek dow = d.getDayOfWeek();
            String diaName = dow.name(); // LUNES..DOMINGO in English uppercase, model stores Spanish but horarios may
                                         // use uppercase names

            // Buscar horario que coincida (se usa contains por seguridad)
            var horarioOpt = consultorio.getHorariosSemanales().stream()
                    .filter(h -> h.getActivo() != null && h.getActivo())
                    .filter(h -> h.getDiaSemana() != null
                            && h.getDiaSemana().toUpperCase().contains(diaName.substring(0, 3)))
                    .findFirst();

            if (horarioOpt.isPresent()) {
                var h = horarioOpt.get();
                if (h.getHoraApertura() != null && h.getHoraCierre() != null
                        && h.getHoraCierre().isAfter(h.getHoraApertura())) {
                    long mins = ChronoUnit.MINUTES.between(h.getHoraApertura(), h.getHoraCierre());
                    total += mins;
                } else {
                    total += fallbackMinutes;
                }
            } else {
                total += fallbackMinutes;
            }

            d = d.plusDays(1);
        }

        return total;
    }

    /**
     * Calcula métricas de calidad usando encuestas y auditoría
     */
    public MetricasDashboardDTO getMetricasCalidad(FiltrosDashboardDTO filtros) {
        MetricasDashboardDTO dto = new MetricasDashboardDTO();

        LocalDateTime desde = null;
        LocalDateTime hasta = null;
        if (filtros != null) {
            if (filtros.getFechaDesde() != null) {
                desde = filtros.getFechaDesde().atStartOfDay();
            }
            if (filtros.getFechaHasta() != null) {
                hasta = filtros.getFechaHasta().atTime(23, 59, 59);
            }
        }

        // Obtener logs de auditoría de turnos
        List<AuditLog> logs;
        if (desde == null && hasta == null) {
            logs = auditLogRepository.findByEntityTypeOrderByPerformedAtDesc("TURNO");
        } else {
            logs = auditLogRepository.findByEntityTypeAndPerformedAtBetweenOrderByPerformedAtDesc("TURNO", desde,
                    hasta);
        }

        // Agrupar por turno (entityId)
        var byTurno = logs.stream().filter(l -> l.getEntityId() != null).collect(
                Collectors.groupingBy(l -> l.getEntityId(), Collectors.toList()));

        List<Long> asignacionDurations = new ArrayList<>();
        List<Long> reagendamientoDurations = new ArrayList<>();

        for (var entry : byTurno.entrySet()) {
            List<AuditLog> lista = entry.getValue().stream()
                    .sorted(Comparator.comparing(AuditLog::getPerformedAt))
                    .collect(Collectors.toList());

            // Buscar CREATE y ASSIGN
            LocalDateTime createTime = null;
            LocalDateTime assignTime = null;
            for (var a : lista) {
                if (AuditLog.Actions.CREATE.equals(a.getAction())) {
                    if (createTime == null)
                        createTime = a.getPerformedAt();
                }
                if (AuditLog.Actions.ASSIGN.equals(a.getAction())) {
                    if (assignTime == null)
                        assignTime = a.getPerformedAt();
                }
            }
            if (createTime != null && assignTime != null && !assignTime.isBefore(createTime)) {
                long mins = Duration.between(createTime, assignTime).toMinutes();
                asignacionDurations.add(mins);
            }

            // Reagendamientos
            for (int i = 0; i < lista.size(); i++) {
                var a = lista.get(i);
                if (AuditLog.Actions.RESCHEDULE.equals(a.getAction())) {
                    if (i > 0) {
                        var prev = lista.get(i - 1);
                        long mins = Duration.between(prev.getPerformedAt(), a.getPerformedAt()).toMinutes();
                        reagendamientoDurations.add(mins);
                    }
                }
            }
        }

        double avgAsignacion = 0.0;
        if (!asignacionDurations.isEmpty()) {
            avgAsignacion = asignacionDurations.stream().mapToLong(Long::longValue).average().orElse(0.0);
        }

        double avgReagenda = 0.0;
        if (!reagendamientoDurations.isEmpty()) {
            avgReagenda = reagendamientoDurations.stream().mapToLong(Long::longValue).average().orElse(0.0);
        }

        dto.setTiempoPromedioSolicitudAsignacionMinutos(avgAsignacion);
        dto.setTiempoPromedioReagendamientoMinutos(avgReagenda);

        // ----- Satisfacción y quejas usando encuestas -----
        System.out.println("📊 Calculando métricas de encuestas...");
        System.out.println("   Rango de fechas: " + desde + " - " + hasta);

        try {
            // Tipos de preguntas numéricas para satisfacción
            List<TipoPregunta> tiposNumericos = Arrays.asList(
                    TipoPregunta.CSAT,
                    TipoPregunta.NPS,
                    TipoPregunta.RATING_TRATO,
                    TipoPregunta.RATING_ESPERA);

            System.out.println("   Tipos a consultar: " + tiposNumericos);

            // Calcular satisfacción promedio
            Double avgSatisf = encuestaRespuestaRepository.averageValorNumericoByTipoInAndFechaBetween(
                    tiposNumericos, desde, hasta);

            System.out.println("   ✅ Satisfacción promedio: " + avgSatisf);
            dto.setSatisfaccionPromedio(avgSatisf != null ? avgSatisf : 0.0);

            // Contar comentarios de texto libre
            Long countTexto = encuestaRespuestaRepository.countTextoLibreByFechaBetween(desde, hasta);
            System.out.println("   ✅ Comentarios de texto: " + countTexto);

            // Contar respuestas con puntuación baja (quejas potenciales)
            Long countLow = encuestaRespuestaRepository.countLowScoreByTiposAndFechaBetween(
                    Arrays.asList(TipoPregunta.CSAT), 2, desde, hasta);
            System.out.println("   ✅ Puntuaciones bajas (<=2): " + countLow);

            long totalQuejas = (countTexto != null ? countTexto : 0L) + (countLow != null ? countLow : 0L);
            dto.setConteoQuejas(totalQuejas);

            System.out.println("   ✅ Total quejas detectadas: " + totalQuejas);

        } catch (Exception ex) {
            System.err.println("❌ Error al calcular métricas de encuestas: " + ex.getMessage());
            ex.printStackTrace(); // IMPORTANTE: Ver stack trace completo

            // Valores por defecto en caso de error
            dto.setSatisfaccionPromedio(0.0);
            dto.setConteoQuejas(0L);
        }

        return dto;
    }

    /**
     * Métricas predictivas: demanda insatisfecha por especialidad usando
     * ListaEspera
     */
    public List<Map<String, Object>> getMetricasPredictivas(FiltrosDashboardDTO filtros) {
        var stats = listaEsperaRepository.getEstadisticasPorEspecialidad();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] row : stats) {
            Map<String, Object> m = new HashMap<>();
            m.put("especialidad", row[0]);
            m.put("pendientes", row[1]);
            m.put("urgentes", row[2]);
            m.put("avgDiasEspera", row[3]);
            out.add(m);
        }
        return out;
    }

    /**
     * Devuelve comentarios de encuestas (texto libre)
     */
    public List<String> getComentarios(FiltrosDashboardDTO filtros) {
        LocalDateTime desde = null;
        LocalDateTime hasta = null;
        if (filtros != null) {
            if (filtros.getFechaDesde() != null)
                desde = filtros.getFechaDesde().atStartOfDay();
            if (filtros.getFechaHasta() != null)
                hasta = filtros.getFechaHasta().atTime(23, 59, 59);
        }
        return encuestaRespuestaRepository.findComentariosByFechaBetween(desde, hasta);
    }
}
