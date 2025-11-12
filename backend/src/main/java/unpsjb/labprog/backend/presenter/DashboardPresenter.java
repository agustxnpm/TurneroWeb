package unpsjb.labprog.backend.presenter;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.DashboardService;
import unpsjb.labprog.backend.dto.FiltrosDashboardDTO;

@RestController
@RequestMapping("admin-dashboard")
public class DashboardPresenter {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/metricas-basicas")
    public ResponseEntity<Object> getMetricasBasicas(
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta,
            @RequestParam(required = false) Integer centroId,
            @RequestParam(required = false) Integer consultorioId,
            @RequestParam(required = false) Integer staffMedicoId,
            @RequestParam(required = false) Integer especialidadId) {
        try {
            FiltrosDashboardDTO filtros = new FiltrosDashboardDTO();
            filtros.setFechaDesde(fechaDesde != null && !fechaDesde.isEmpty() ? LocalDate.parse(fechaDesde) : null);
            filtros.setFechaHasta(fechaHasta != null && !fechaHasta.isEmpty() ? LocalDate.parse(fechaHasta) : null);
            filtros.setCentroId(centroId);
            filtros.setConsultorioId(consultorioId);
            filtros.setStaffMedicoId(staffMedicoId);
            filtros.setEspecialidadId(especialidadId);

            var metrics = dashboardService.getMetricasBasicas(filtros);
            return Response.ok(metrics, "Métricas básicas calculadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al calcular métricas: " + e.getMessage());
        }
    }

    @GetMapping("/metricas-ocupacion")
    public ResponseEntity<Object> getMetricasOcupacion(
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta,
            @RequestParam(required = false) Integer centroId,
            @RequestParam(required = false) Integer consultorioId) {
        try {
            FiltrosDashboardDTO filtros = new FiltrosDashboardDTO();
            filtros.setFechaDesde(fechaDesde != null && !fechaDesde.isEmpty() ? LocalDate.parse(fechaDesde) : null);
            filtros.setFechaHasta(fechaHasta != null && !fechaHasta.isEmpty() ? LocalDate.parse(fechaHasta) : null);
            filtros.setCentroId(centroId);
            filtros.setConsultorioId(consultorioId);

            var metrics = dashboardService.getMetricasOcupacion(filtros);
            return Response.ok(metrics, "Métricas de ocupación calculadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al calcular métricas de ocupación: " + e.getMessage());
        }
    }

    @GetMapping("/metricas-calidad")
    public ResponseEntity<Object> getMetricasCalidad(
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta,
            @RequestParam(required = false) Integer centroId,
            @RequestParam(required = false) Integer consultorioId,
            @RequestParam(required = false) Integer staffMedicoId,
            @RequestParam(required = false) Integer especialidadId) {
        try {
            FiltrosDashboardDTO filtros = new FiltrosDashboardDTO();
            filtros.setFechaDesde(fechaDesde != null && !fechaDesde.isEmpty() ? LocalDate.parse(fechaDesde) : null);
            filtros.setFechaHasta(fechaHasta != null && !fechaHasta.isEmpty() ? LocalDate.parse(fechaHasta) : null);
            filtros.setCentroId(centroId);
            filtros.setConsultorioId(consultorioId);
            filtros.setStaffMedicoId(staffMedicoId);
            filtros.setEspecialidadId(especialidadId);

            var metrics = dashboardService.getMetricasCalidad(filtros);
            return Response.ok(metrics, "Métricas de calidad calculadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al calcular métricas de calidad: " + e.getMessage());
        }
    }

    @GetMapping("/metricas-predictivas")
    public ResponseEntity<Object> getMetricasPredictivas(
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta) {
        try {
            FiltrosDashboardDTO filtros = new FiltrosDashboardDTO();
            filtros.setFechaDesde(fechaDesde != null && !fechaDesde.isEmpty() ? LocalDate.parse(fechaDesde) : null);
            filtros.setFechaHasta(fechaHasta != null && !fechaHasta.isEmpty() ? LocalDate.parse(fechaHasta) : null);

            var metrics = dashboardService.getMetricasPredictivas(filtros);
            return Response.ok(metrics, "Métricas predictivas calculadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al calcular métricas predictivas: " + e.getMessage());
        }
    }

    @GetMapping("/detalle/comentarios")
    public ResponseEntity<Object> getDetalleComentarios(
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta) {
        try {
            FiltrosDashboardDTO filtros = new FiltrosDashboardDTO();
            filtros.setFechaDesde(fechaDesde != null && !fechaDesde.isEmpty() ? LocalDate.parse(fechaDesde) : null);
            filtros.setFechaHasta(fechaHasta != null && !fechaHasta.isEmpty() ? LocalDate.parse(fechaHasta) : null);

            var comentarios = dashboardService.getComentarios(filtros);
            return Response.ok(comentarios, "Comentarios obtenidos correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener comentarios: " + e.getMessage());
        }
    }

}
