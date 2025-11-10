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
}
