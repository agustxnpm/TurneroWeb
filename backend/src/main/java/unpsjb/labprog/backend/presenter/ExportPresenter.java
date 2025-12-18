package unpsjb.labprog.backend.presenter;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.ExportService;
import unpsjb.labprog.backend.dto.TurnoFilterDTO;

/**
 * Controlador REST para exportaciones de turnos
 */
@RestController
@RequestMapping("/api/export")
public class ExportPresenter {

    @Autowired
    private ExportService exportService;

    @PostMapping("/turnos/csv")
    public ResponseEntity<String> exportTurnosToCSV(@RequestBody TurnoFilterDTO filter) {
        try {
            String csvContent = exportService.exportToCSV(filter);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "turnos_" +
                    java.time.LocalDate.now().toString() + ".csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error al generar CSV: " + e.getMessage());
        }
    }

    @PostMapping("/turnos/html")
    public ResponseEntity<String> exportTurnosToHTML(@RequestBody TurnoFilterDTO filter) {
        try {
            String htmlContent = exportService.exportToHTML(filter);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(htmlContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error al generar HTML: " + e.getMessage());
        }
    }

    @PostMapping("/turnos/pdf")
    public ResponseEntity<String> exportTurnosToPDF(@RequestBody TurnoFilterDTO filter) {
        try {
            // Por ahora retornamos HTML que puede ser convertido a PDF en el frontend
            // o usando bibliotecas como wkhtmltopdf
            String htmlContent = exportService.exportToHTML(filter);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);
            headers.set("X-Export-Type", "PDF");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(htmlContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error al generar reporte para PDF: " + e.getMessage());
        }
    }

    @PostMapping("/turnos/statistics")
    public ResponseEntity<Object> getExportStatistics(@RequestBody TurnoFilterDTO filter) {
        try {
            Map<String, Object> statistics = exportService.getExportStatistics(filter);
            return Response.ok(statistics, "Estadísticas de exportación generadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al generar estadísticas: " + e.getMessage());
        }
    }

    /**
     * Exporta el reporte de atención completada a CSV
     * GET
     * /export/reporte-atencion/csv?staffMedicoId=1&centroAtencionId=1&fechaDesde=2024-01-01&fechaHasta=2024-12-31
     */
    @GetMapping("/reporte-atencion/csv")
    public ResponseEntity<String> exportReporteAtencionToCSV(
            @RequestParam(required = false) Integer staffMedicoId,
            @RequestParam(required = false) Integer centroAtencionId,
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta) {
        try {
            // Parsear fechas
            java.time.LocalDate fechaDesdeParsed = null;
            java.time.LocalDate fechaHastaParsed = null;

            if (fechaDesde != null && !fechaDesde.trim().isEmpty()) {
                fechaDesdeParsed = java.time.LocalDate.parse(fechaDesde.trim());
            }
            if (fechaHasta != null && !fechaHasta.trim().isEmpty()) {
                fechaHastaParsed = java.time.LocalDate.parse(fechaHasta.trim());
            }

            String csvContent = exportService.exportReporteAtencionToCSV(
                    staffMedicoId,
                    centroAtencionId,
                    fechaDesdeParsed,
                    fechaHastaParsed);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "reporte_atencion_completada_" +
                    java.time.LocalDate.now().toString() + ".csv");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error al generar CSV del reporte de atención: " + e.getMessage());
        }
    }

    /**
     * Exporta el reporte de atención completada a HTML (para convertir a PDF en
     * frontend)
     * GET
     * /export/reporte-atencion/html?staffMedicoId=1&centroAtencionId=1&fechaDesde=2024-01-01&fechaHasta=2024-12-31
     */
    @GetMapping("/reporte-atencion/html")
    public ResponseEntity<String> exportReporteAtencionToHTML(
            @RequestParam(required = false) Integer staffMedicoId,
            @RequestParam(required = false) Integer centroAtencionId,
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta) {
        try {
            // Parsear fechas
            java.time.LocalDate fechaDesdeParsed = null;
            java.time.LocalDate fechaHastaParsed = null;

            if (fechaDesde != null && !fechaDesde.trim().isEmpty()) {
                fechaDesdeParsed = java.time.LocalDate.parse(fechaDesde.trim());
            }
            if (fechaHasta != null && !fechaHasta.trim().isEmpty()) {
                fechaHastaParsed = java.time.LocalDate.parse(fechaHasta.trim());
            }

            String htmlContent = exportService.exportReporteAtencionToHTML(
                    staffMedicoId,
                    centroAtencionId,
                    fechaDesdeParsed,
                    fechaHastaParsed);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(htmlContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error al generar HTML del reporte de atención: " + e.getMessage());
        }
    }

    /**
     * Exporta el reporte de atención completada a PDF (vía HTML)
     * GET
     * /export/reporte-atencion/pdf?staffMedicoId=1&centroAtencionId=1&fechaDesde=2024-01-01&fechaHasta=2024-12-31
     */
    @GetMapping("/reporte-atencion/pdf")
    public ResponseEntity<String> exportReporteAtencionToPDF(
            @RequestParam(required = false) Integer staffMedicoId,
            @RequestParam(required = false) Integer centroAtencionId,
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta) {
        try {
            // Parsear fechas
            java.time.LocalDate fechaDesdeParsed = null;
            java.time.LocalDate fechaHastaParsed = null;

            if (fechaDesde != null && !fechaDesde.trim().isEmpty()) {
                fechaDesdeParsed = java.time.LocalDate.parse(fechaDesde.trim());
            }
            if (fechaHasta != null && !fechaHasta.trim().isEmpty()) {
                fechaHastaParsed = java.time.LocalDate.parse(fechaHasta.trim());
            }

            // Obtener HTML que será convertido a PDF en el frontend
            String htmlContent = exportService.exportReporteAtencionToHTML(
                    staffMedicoId,
                    centroAtencionId,
                    fechaDesdeParsed,
                    fechaHastaParsed);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);
            headers.set("X-Export-Type", "PDF");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(htmlContent);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error al generar reporte para PDF: " + e.getMessage());
        }
    }
}