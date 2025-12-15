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
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.ConsultorioRepository;
import unpsjb.labprog.backend.business.repository.TurnoRepository;
import unpsjb.labprog.backend.business.repository.EncuestaRespuestaRepository;
import unpsjb.labprog.backend.business.repository.AuditLogRepository;
import unpsjb.labprog.backend.business.repository.ListaEsperaRepository;
import unpsjb.labprog.backend.dto.FiltrosDashboardDTO;
import unpsjb.labprog.backend.dto.MetricasDashboardDTO;
import unpsjb.labprog.backend.dto.OcupacionConsultorioDTO;
import unpsjb.labprog.backend.dto.EncuestaDetalleDTO;
import unpsjb.labprog.backend.model.AuditLog;
import unpsjb.labprog.backend.model.Consultorio;
import unpsjb.labprog.backend.model.Turno;
import unpsjb.labprog.backend.model.EstadoTurno;
import unpsjb.labprog.backend.model.TipoPregunta;
import unpsjb.labprog.backend.model.EncuestaRespuesta;

@Service
@Transactional(readOnly = true)
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

    // Fechas por defecto para evitar errores JDBC con nulls
    private static final LocalDateTime FECHA_INICIO_DEFAULT = LocalDateTime.of(1970, 1, 1, 0, 0);
    private static final LocalDateTime FECHA_FIN_DEFAULT = LocalDateTime.of(2100, 12, 31, 23, 59);

    /**
     * Calcula métricas básicas (conteos y tasas) aplicando filtros de fechas y
     * entidades
     */
    public MetricasDashboardDTO getMetricasBasicas(FiltrosDashboardDTO filtros) {
        MetricasDashboardDTO dto = new MetricasDashboardDTO();

        LocalDate desde = filtros != null ? filtros.getFechaDesde() : null;
        LocalDate hasta = filtros != null ? filtros.getFechaHasta() : null;

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

        dto.setTasaAsistencia(percentSafe(completos, completos + ausentes));
        dto.setPorcentajeAusentismo(percentSafe(ausentes, completos + ausentes));
        dto.setPorcentajeCancelaciones(percentSafe(cancelados, total));
        dto.setConfirmadosVsProgramados(percentSafe(confirmados, confirmados + programados));

        int sinConsultorio = (int) turnos.stream().filter(t -> t.getConsultorio() == null).count();
        dto.setTurnosSinConsultorio(sinConsultorio);

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

        var spec = TurnoRepository.buildSpecification(
                null, null, null, null,
                filtros != null ? filtros.getCentroId() : null,
                filtros != null ? filtros.getConsultorioId() : null,
                desde, hasta, null, null, null, null, null);

        List<Turno> turnos = turnoRepository.findAll(spec);

        for (Consultorio c : consultorios) {
            List<Turno> turnosC = turnos.stream().filter(t -> t.getConsultorio() != null &&
                    t.getConsultorio().getId().equals(c.getId())).collect(Collectors.toList());

            long minutosOcupados = 0;
            for (Turno t : turnosC) {
                if (t.getEstado() != EstadoTurno.CANCELADO && t.getHoraInicio() != null && t.getHoraFin() != null) {
                    minutosOcupados += ChronoUnit.MINUTES.between(t.getHoraInicio(), t.getHoraFin());
                }
            }

            long minutosDisponibles = calcularMinutosDisponiblesConsultorio(c, desde, hasta);

            double porcentaje = 0.0;
            if (minutosDisponibles > 0) {
                porcentaje = ((double) minutosOcupados / minutosDisponibles) * 100.0;
            }
            if (porcentaje < 0)
                porcentaje = 0.0;
            if (porcentaje > 100.0)
                porcentaje = 100.0;

            ocupacionMap.put(c.getId(), porcentaje);

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

    private long calcularMinutosDisponiblesConsultorio(Consultorio consultorio, LocalDate desde, LocalDate hasta) {
        if (consultorio == null || desde == null || hasta == null)
            return 0;

        long total = 0;
        long fallbackMinutes = 480;
        LocalDate d = desde;
        while (!d.isAfter(hasta)) {
            DayOfWeek dow = d.getDayOfWeek();
            String diaName = dow.name();

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
                    // Configurado pero horas inválidas -> 0
                    total += 0;
                }
            } else {
                // --- CORRECCIÓN AQUÍ ---
                // Si no hay horario configurado, solo aplicamos fallback de lunes a viernes.
                // Evitamos sumar 8 horas los domingos, lo que diluye la métrica.
                if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                    total += fallbackMinutes;
                } else {
                    total += 0; // Fines de semana cerrados por defecto
                }
            }
            d = d.plusDays(1);
        }
        return total;
    }

    /**
     * Calcula métricas de calidad usando encuestas y auditoría.
     * Usa lógica "Safe-Dates" para evitar errores JDBC con nulls.
     */
    public MetricasDashboardDTO getMetricasCalidad(FiltrosDashboardDTO filtros) {
        MetricasDashboardDTO dto = new MetricasDashboardDTO();

        // 1. Preparar filtros con valores por defecto (Evita nulls en queries)
        LocalDateTime desde = (filtros != null && filtros.getFechaDesde() != null)
                ? filtros.getFechaDesde().atStartOfDay()
                : FECHA_INICIO_DEFAULT;

        LocalDateTime hasta = (filtros != null && filtros.getFechaHasta() != null)
                ? filtros.getFechaHasta().atTime(23, 59, 59)
                : FECHA_FIN_DEFAULT;

        Integer centroId = (filtros != null) ? filtros.getCentroId() : null;

        // 2. Métricas de Auditoría: TIEMPOS DE GESTIÓN
        List<AuditLog> logs = auditLogRepository.findByEntityTypeAndPerformedAtBetweenOrderByPerformedAtDesc(
                "TURNO", desde, hasta);

        var byTurno = logs.stream().filter(l -> l.getEntityId() != null).collect(
                Collectors.groupingBy(l -> l.getEntityId(), Collectors.toList()));

        List<Long> anticipacionDias = new ArrayList<>();
        List<Long> reagendamientoDurations = new ArrayList<>();

        for (var entry : byTurno.entrySet()) {
            List<AuditLog> lista = entry.getValue().stream()
                    .sorted(Comparator.comparing(AuditLog::getPerformedAt))
                    .collect(Collectors.toList());

            // --- CÁLCULO DE ANTICIPACIÓN (Tiempo de espera desde la reserva) ---
            // Buscamos el log de creación para saber CUÁNDO se pidió el turno
            AuditLog logCreacion = lista.stream()
                    .filter(l -> AuditLog.Actions.CREATE.equals(l.getAction()))
                    .findFirst()
                    .orElse(null);

            // Si tenemos el log y podemos acceder al turno asociado, comparamos fechas
            if (logCreacion != null && logCreacion.getTurno() != null) {
                LocalDate fechaAlta = logCreacion.getPerformedAt().toLocalDate();
                LocalDate fechaTurno = logCreacion.getTurno().getFecha();

                if (fechaTurno != null) {
                    long dias = ChronoUnit.DAYS.between(fechaAlta, fechaTurno);
                    // Solo consideramos valores positivos (por si hay errores de datos históricos)
                    if (dias >= 0) {
                        anticipacionDias.add(dias);
                    }
                }
            }

            // --- CÁLCULO DE REAGENDAMIENTO (Agilidad operativa) ---
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

        // Promedios
        double avgAnticipacion = anticipacionDias.stream().mapToLong(Long::longValue).average().orElse(0.0);
        double avgReagenda = reagendamientoDurations.stream().mapToLong(Long::longValue).average().orElse(0.0);

        // Usamos el campo existente para devolver el nuevo valor (Anticipación en Días)
        // NOTA: El nombre del campo en el DTO es
        // 'TiempoPromedioSolicitudAsignacionMinutos'
        // pero ahora contiene 'Días Promedio de Anticipación'.
        dto.setTiempoPromedioSolicitudAsignacionMinutos(avgAnticipacion);
        dto.setTiempoPromedioReagendamientoMinutos(avgReagenda);

        // 3. Métricas de Encuestas (Satisfacción y Quejas)
        System.out.println("📊 Calculando métricas de encuestas (Safe Mode)...");
        System.out.println("   Rango efectivo: " + desde + " - " + hasta);

        try {
            // Definimos qué preguntas nos importan para satisfacción y quejas
            List<TipoPregunta> tiposNumericos = Arrays.asList(
                    TipoPregunta.CSAT, TipoPregunta.NPS,
                    TipoPregunta.RATING_TRATO, TipoPregunta.RATING_ESPERA);

            // A) Satisfacción Promedio
            Double avgSatisf = encuestaRespuestaRepository.calcularPromedio(centroId, tiposNumericos, desde, hasta);
            dto.setSatisfaccionPromedio(avgSatisf != null ? avgSatisf : 0.0);
            System.out.println("   ✅ Satisfacción promedio: " + avgSatisf);

            // B) Conteo de Encuestas Respondidas (Turnos únicos con respuestas)
            List<Integer> turnosConEncuestas = encuestaRespuestaRepository.findTurnosConEncuestas(centroId, desde, hasta);
            long numeroEncuestas = turnosConEncuestas != null ? turnosConEncuestas.size() : 0;
            System.out.println("   ✅ Número de encuestas respondidas: " + numeroEncuestas);
            dto.setNumeroComentarios(numeroEncuestas);

            // C) Conteo Comentarios con Texto
            Long countTexto = encuestaRespuestaRepository.contarComentarios(centroId, desde, hasta);
            System.out.println("   ✅ Comentarios de texto: " + countTexto);

            // D) Conteo Puntuaciones Bajas (Quejas)
            // MEJORA: Usamos todos los tipos numéricos para capturar quejas de trato o
            // espera
            Long countLow = encuestaRespuestaRepository.contarAlertas(centroId, tiposNumericos, 2, desde, hasta);
            System.out.println("   ✅ Puntuaciones bajas (<=2): " + countLow);

            long totalQuejas = (countTexto != null ? countTexto : 0L) + (countLow != null ? countLow : 0L);
            dto.setConteoQuejas(totalQuejas);

        } catch (Exception ex) {
            System.err.println("❌ Error al calcular métricas de encuestas: " + ex.getMessage());
            ex.printStackTrace();
            dto.setSatisfaccionPromedio(0.0);
            dto.setConteoQuejas(0L);
            dto.setNumeroComentarios(0L);
        }

        return dto;
    }

    /**
     * Métricas predictivas: demanda insatisfecha por especialidad
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
     * Devuelve comentarios de encuestas.
     * Usa lógica Safe-Dates para reutilizar el método Between sin
     * errores.
     */
    public List<String> getComentarios(FiltrosDashboardDTO filtros) {
        LocalDateTime desde = (filtros != null && filtros.getFechaDesde() != null)
                ? filtros.getFechaDesde().atStartOfDay()
                : FECHA_INICIO_DEFAULT;

        LocalDateTime hasta = (filtros != null && filtros.getFechaHasta() != null)
                ? filtros.getFechaHasta().atTime(23, 59, 59)
                : FECHA_FIN_DEFAULT;

        // Al usar fechas default (1970-2100), esta llamada funciona como "Traer Todo"
        // o "Filtrar por Rango" según corresponda, sin necesidad de ifs.
        // Asume que en el repo existe findComentariosByFechasBetween(desde, hasta).
        return encuestaRespuestaRepository.findComentariosByFechasBetween(desde, hasta);
    }

    /**
     * Obtener encuestas detalladas.
     * Usa llamada única simplificada.
     */
    public List<EncuestaDetalleDTO> getEncuestasDetalladas(FiltrosDashboardDTO filtros) {
        LocalDateTime desde = (filtros != null && filtros.getFechaDesde() != null)
                ? filtros.getFechaDesde().atStartOfDay()
                : FECHA_INICIO_DEFAULT;

        LocalDateTime hasta = (filtros != null && filtros.getFechaHasta() != null)
                ? filtros.getFechaHasta().atTime(23, 59, 59)
                : FECHA_FIN_DEFAULT;

        Integer centroId = (filtros != null) ? filtros.getCentroId() : null;

        // Llamada unificada al repositorio
        List<Integer> turnosConEncuesta = encuestaRespuestaRepository.findTurnosConEncuestas(
                centroId, desde, hasta);

        List<EncuestaDetalleDTO> resultados = new ArrayList<>();

        for (Integer turnoId : turnosConEncuesta) {
            List<EncuestaRespuesta> respuestas = encuestaRespuestaRepository.findAllByTurnoIdWithDetails(turnoId);

            if (respuestas.isEmpty())
                continue;

            EncuestaRespuesta primeraRespuesta = respuestas.get(0);
            Turno turno = primeraRespuesta.getTurno();

            EncuestaDetalleDTO dto = new EncuestaDetalleDTO();
            dto.setTurnoId(turno.getId());
            dto.setFechaTurno(turno.getFecha());

            dto.setPacienteId(turno.getPaciente().getId());
            dto.setPacienteNombre(turno.getPaciente().getApellido() + " " + turno.getPaciente().getNombre());

            dto.setMedicoId(turno.getMedico().getId());
            dto.setMedicoNombre(turno.getMedico().getApellido() + " " + turno.getMedico().getNombre());
            dto.setCentroAtencionId(turno.getCentroAtencion().getId());
            dto.setCentroAtencionNombre(turno.getCentroAtencion().getNombre());

            if (turno.getEspecialidad() != null) {
                dto.setEspecialidadNombre(turno.getEspecialidad().getNombre());
            }

            LocalDateTime fechaRespuesta = respuestas.stream()
                    .map(EncuestaRespuesta::getFechaCreacion)
                    .max(LocalDateTime::compareTo)
                    .orElse(null);
            dto.setFechaRespuesta(fechaRespuesta);

            Map<String, Object> respuestasMap = new HashMap<>();
            String comentario = null;

            for (EncuestaRespuesta resp : respuestas) {
                String tipoPregunta = resp.getPregunta().getTipo().name();

                if (resp.getPregunta().getTipo() == TipoPregunta.TEXTO_LIBRE) {
                    comentario = resp.getValorTexto();
                } else if (resp.getValorNumerico() != null) {
                    respuestasMap.put(tipoPregunta, resp.getValorNumerico());
                }
            }

            dto.setRespuestas(respuestasMap);
            dto.setComentario(comentario);

            resultados.add(dto);
        }

        return resultados;
    }
}