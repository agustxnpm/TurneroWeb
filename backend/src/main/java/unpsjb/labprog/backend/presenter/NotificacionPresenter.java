package unpsjb.labprog.backend.presenter;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.business.service.NotificacionService;
import unpsjb.labprog.backend.dto.NotificacionDTO;

@RestController
@RequestMapping("notificaciones")
@CrossOrigin(origins = "*")
public class NotificacionPresenter {

    @Autowired
    private NotificacionService notificacionService;

    /**
     * Obtener todas las notificaciones de un paciente (paginadas)
     */
    @GetMapping("/paciente/{pacienteId}")
    public ResponseEntity<Page<NotificacionDTO>> obtenerNotificacionesPorPaciente(
            @PathVariable Integer pacienteId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Page<NotificacionDTO> notificaciones = notificacionService.obtenerNotificacionesPorPaciente(pacienteId, page, size);
        return ResponseEntity.ok(notificaciones);
    }

    /**
     * Obtener notificaciones no leídas de un paciente
     */
    @GetMapping("/paciente/{pacienteId}/no-leidas")
    public ResponseEntity<List<NotificacionDTO>> obtenerNotificacionesNoLeidas(@PathVariable Integer pacienteId) {
        List<NotificacionDTO> notificaciones = notificacionService.obtenerNotificacionesNoLeidas(pacienteId);
        return ResponseEntity.ok(notificaciones);
    }

    /**
     * Contar notificaciones no leídas de un paciente
     */
    @GetMapping("/paciente/{pacienteId}/count-no-leidas")
    public ResponseEntity<Long> contarNotificacionesNoLeidas(@PathVariable Integer pacienteId) {
        Long count = notificacionService.contarNotificacionesNoLeidas(pacienteId);
        return ResponseEntity.ok(count);
    }

    /**
     * Marcar una notificación como leída
     */
    @PutMapping("/{notificacionId}/marcar-leida")
    public ResponseEntity<Void> marcarComoLeida(
            @PathVariable Long notificacionId,
            @RequestParam Integer pacienteId) {
        
        notificacionService.marcarComoLeida(notificacionId, pacienteId);
        return ResponseEntity.ok().build();
    }

    /**
     * Marcar todas las notificaciones de un paciente como leídas
     */
    @PutMapping("/paciente/{pacienteId}/marcar-todas-leidas")
    public ResponseEntity<Void> marcarTodasComoLeidas(@PathVariable Integer pacienteId) {
        notificacionService.marcarTodasComoLeidas(pacienteId);
        return ResponseEntity.ok().build();
    }

    /**
     * Eliminar una notificación
     */
    @DeleteMapping("/{notificacionId}")
    public ResponseEntity<Void> eliminarNotificacion(
            @PathVariable Long notificacionId,
            @RequestParam Integer pacienteId) {
        
        notificacionService.eliminarNotificacion(notificacionId, pacienteId);
        return ResponseEntity.ok().build();
    }
}
