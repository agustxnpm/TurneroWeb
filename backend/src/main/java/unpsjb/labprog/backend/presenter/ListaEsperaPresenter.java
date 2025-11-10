package unpsjb.labprog.backend.presenter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.ListaEsperaService;
import unpsjb.labprog.backend.dto.ListaEsperaDTO;

@RestController
@RequestMapping("/lista-espera")
public class ListaEsperaPresenter {

    @Autowired
    private ListaEsperaService service;

    // Listar toda la lista de espera
    @GetMapping
    public ResponseEntity<Object> getAll() {
        List<ListaEsperaDTO> lista = service.findAll();
        return Response.ok(lista, "Lista de espera recuperada correctamente");
    }

    // Obtener lista de espera por ID
    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable Long id) {
        Optional<ListaEsperaDTO> dtoOpt = service.findById(id);
        if (!dtoOpt.isPresent()) {
            return Response.notFound("No se encontró la solicitud con id " + id);
        }
        return Response.ok(dtoOpt.get(), "Solicitud recuperada correctamente");
    }

    // Agregar nueva solicitud a lista de espera
    @PostMapping
    public ResponseEntity<Object> add(@RequestBody ListaEsperaDTO dto) {
        try {
            ListaEsperaDTO saved = service.save(dto);
            return Response.ok(saved, "Solicitud agregada exitosamente");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Actualizar solicitud existente
    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable Long id, @RequestBody ListaEsperaDTO dto) {
        try {
            dto.setId(id); // Asegurar que el ID del DTO coincida con el de la URL
            ListaEsperaDTO updated = service.update(dto);
            return Response.ok(updated, "Solicitud actualizada exitosamente");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Marcar solicitud como resuelta
    @PatchMapping("/{id}/resolver")
    public ResponseEntity<Object> marcarComoResuelta(@PathVariable Long id) {
        try {
            ListaEsperaDTO resolved = service.marcarComoResuelta(id);
            return Response.ok(resolved, "Solicitud marcada como resuelta");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Marcar solicitud como cubierta
    @PatchMapping("/{id}/cubrir")
    public ResponseEntity<Object> marcarComoCubierta(@PathVariable Long id) {
        try {
            ListaEsperaDTO covered = service.marcarComoCubierta(id);
            return Response.ok(covered, "Solicitud marcada como cubierta");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Eliminar solicitud
    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return Response.ok(null, "Solicitud eliminada exitosamente");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Obtener solicitudes pendientes
    @GetMapping("/pendientes")
    public ResponseEntity<Object> getPendientes() {
        List<ListaEsperaDTO> pendientes = service.findPendientes();
        return Response.ok(pendientes, "Solicitudes pendientes recuperadas correctamente");
    }

    // Obtener solicitudes urgentes
    @GetMapping("/urgentes")
    public ResponseEntity<Object> getUrgentes() {
        List<ListaEsperaDTO> urgentes = service.findUrgentes();
        return Response.ok(urgentes, "Solicitudes urgentes recuperadas correctamente");
    }

    // Obtener estadísticas generales
    @GetMapping("/estadisticas")
    public ResponseEntity<Object> getEstadisticas() {
        Map<String, Object> estadisticas = service.obtenerEstadisticasGenerales();
        return Response.ok(estadisticas, "Estadísticas recuperadas correctamente");
    }

    // Búsqueda avanzada con filtros
    @GetMapping("/buscar")
    public ResponseEntity<Object> buscarConFiltros(
            @RequestParam(required = false) Integer especialidadId,
            @RequestParam(required = false) Integer centroAtencionId,
            @RequestParam(required = false) Integer medicoId,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String urgenciaMedica,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate fechaHasta,
            @RequestParam(required = false) Integer tiempoEsperaMinimo,
            @RequestParam(required = false) Integer tiempoEsperaMaximo,
            @RequestParam(required = false, defaultValue = "URGENCIA_TIEMPO") String ordenamiento) {

        List<ListaEsperaDTO> resultados = service.buscarConFiltros(
                especialidadId, centroAtencionId, medicoId, estado, urgenciaMedica,
                fechaDesde, fechaHasta, tiempoEsperaMinimo, tiempoEsperaMaximo, ordenamiento);

        String mensaje = String.format("Se encontraron %d resultados con los filtros aplicados", resultados.size());
        return Response.ok(resultados, mensaje);
    }

    // Obtener ranking de espera por especialidad
    @GetMapping("/ranking/{especialidadId}")
    public ResponseEntity<Object> getRankingEspera(@PathVariable Integer especialidadId) {
        try {
            List<Map<String, Object>> ranking = service.obtenerRankingEspera(especialidadId);
            return Response.ok(ranking, "Ranking recuperado correctamente");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Cancelar solicitudes expiradas
    @PostMapping("/cancelar-expiradas")
    public ResponseEntity<Object> cancelarExpiradas() {
        try {
            int canceladas = service.cancelarSolicitudesExpiradas();
            return Response.ok(Map.of("canceladas", canceladas),
                    String.format("Se cancelaron %d solicitudes expiradas", canceladas));
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Enviar recordatorios a solicitudes antiguas
    @PostMapping("/enviar-recordatorios")
    public ResponseEntity<Object> enviarRecordatorios(@RequestParam(defaultValue = "30") int diasMinimos) {
        try {
            int enviados = service.enviarRecordatoriosSolicitudesPendientes(diasMinimos);
            return Response.ok(Map.of("recordatoriosEnviados", enviados),
                    String.format("Se enviaron %d recordatorios", enviados));
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Marcar solicitud como resuelta por otro medio
    @PutMapping("/{id}/resolver-manual")
    public ResponseEntity<Object> marcarComoResueltaPorOtroMedio(@PathVariable Long id) {
        try {
            ListaEsperaDTO resolved = service.marcarComoResueltaPorOtroMedio(id);
            return Response.ok(resolved, "Solicitud marcada como resuelta por otro medio");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }

    // Obtener estadísticas de demanda insatisfecha
    @GetMapping("/estadisticas/demanda")
    public ResponseEntity<Object> getEstadisticasDemanda(
            @RequestParam(defaultValue = "mes_actual") String periodo) {
        try {
            Map<String, Long> estadisticas = service.obtenerEstadisticasDemanda(periodo);
            return Response.ok(estadisticas, "Estadísticas de demanda recuperadas correctamente");
        } catch (RuntimeException e) {
            return Response.error(null, e.getMessage());
        }
    }
}