package unpsjb.labprog.backend.business.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import unpsjb.labprog.backend.business.repository.ConsultorioRepository;
import unpsjb.labprog.backend.business.repository.TurnoRepository;
import unpsjb.labprog.backend.dto.FiltrosDashboardDTO;
import unpsjb.labprog.backend.dto.MetricasDashboardDTO;
import unpsjb.labprog.backend.dto.OcupacionConsultorioDTO;
import unpsjb.labprog.backend.model.Consultorio;
import unpsjb.labprog.backend.model.Turno;
import unpsjb.labprog.backend.model.EstadoTurno;

@Service
public class DashboardService {

    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private ConsultorioRepository consultorioRepository;

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
}
