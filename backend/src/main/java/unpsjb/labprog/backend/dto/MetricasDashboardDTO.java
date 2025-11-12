package unpsjb.labprog.backend.dto;

import java.util.List;
import java.util.Map;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MetricasDashboardDTO {
    // Totales
    private Long totalTurnos;

    // Conteo por estado: PROGRAMADO, CONFIRMADO, CANCELADO, COMPLETO, AUSENTE, REAGENDADO
    private Map<String, Long> turnosPorEstado;

    // Porcentajes (0..100)
    private Double tasaAsistencia; // COMPLETO / (COMPLETO + AUSENTE) *100
    private Double porcentajeCancelaciones; // CANCELADO / total *100
    private Double porcentajeAusentismo; // AUSENTE / (COMPLETO + AUSENTE) *100
    private Double confirmadosVsProgramados; // CONFIRMADO / (CONFIRMADO + PROGRAMADO) *100

    // Datos de ocupación y asignación
    private Map<Integer, Double> ocupacionPorConsultorio; // consultorioId -> porcentaje ocupación (0..100) - DEPRECATED
    private List<OcupacionConsultorioDTO> ocupacionDetallada; // Lista detallada con info completa
    private Integer turnosSinConsultorio; // count
    private Double eficienciaAsignacion; // 0..100, heurística usando ConsultorioDistribucionService

    // ----- Métricas de calidad -----
    // Tiempo promedio (minutos) desde creación/solicitud hasta asignación
    private Double tiempoPromedioSolicitudAsignacionMinutos;

    // Tiempo promedio (minutos) de reagendamiento (duración desde solicitud de reagenda hasta acción)
    private Double tiempoPromedioReagendamientoMinutos;

    // Satisfacción promedio (AVG valorNumerico para preguntas tipo CSAT/NPS/RATING_*)
    private Double satisfaccionPromedio;

    // Conteo de quejas/reclamos detectados (texto libre no vacío o puntuaciones bajas)
    private Long conteoQuejas;

}
