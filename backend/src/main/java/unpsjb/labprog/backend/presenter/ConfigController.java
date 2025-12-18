package unpsjb.labprog.backend.presenter;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.business.service.AuditLogService;
import unpsjb.labprog.backend.business.service.ConfiguracionService;
import unpsjb.labprog.backend.model.AuditLog;
import unpsjb.labprog.backend.model.Configuracion;

@RestController
@RequestMapping("/api/config")
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'OPERADOR')")
public class ConfigController {

    @Autowired
    private ConfiguracionService configuracionService;

    @Autowired
    private AuditLogService auditLogService; // Asumiendo que existe para auditoría

    /**
     * Obtiene todas las configuraciones por categoría (e.g., "TURNOS",
     * "NOTIFICACIONES")
     */
    @GetMapping("/categoria/{categoria}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Configuracion>> getPorCategoria(@PathVariable String categoria) {
        return ResponseEntity.ok(configuracionService.getConfiguracionesPorCategoria(categoria));
    }

    /**
     * Obtiene un resumen de configuraciones para turnos (usa el método existente en
     * ConfiguracionService)
     */
    @GetMapping("/resumen/turnos")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getResumenTurnos() {
        return ResponseEntity.ok(configuracionService.getResumenConfiguracionTurnos());
    }

    /**
     * Obtiene un resumen de configuraciones para notificaciones
     */
    @GetMapping("/resumen/notificaciones")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getResumenNotificaciones() {
        return ResponseEntity.ok(configuracionService.getResumenConfiguracionNotificaciones());
    }

    /**
     * Actualiza una configuración específica
     * Body: { "clave": "turnos.dias_max_no_confirm", "valor": 10 }
     */
    @PostMapping("/update")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'OPERADOR')")
    public ResponseEntity<String> updateConfig(@RequestBody ConfigUpdateDTO dto) {
        // Obtener valor actual para auditoría
        Configuracion currentConfig = configuracionService.getConfiguracion(dto.getClave());
        Object oldValue = currentConfig != null ? currentConfig.getValor() : null;

        // Validaciones específicas
        if (dto.getClave().startsWith("turnos.")) {
            configuracionService.validarConfiguracionesTurnos();
            if ("turnos.dias_max_no_confirm".equals(dto.getClave())) {
                int valor = (Integer) dto.getValor();
                if (valor < 3 || valor > 30) {
                    throw new IllegalArgumentException("Valor debe estar entre 3 y 30");
                }
                if (valor <= configuracionService.getDiasMinConfirmacion()) {
                    throw new IllegalArgumentException("dias_max_no_confirm debe ser mayor que dias_min_confirmacion");
                }
            }
        }

        configuracionService.actualizarConfiguracion(dto.getClave(), dto.getValor());
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        auditLogService.logConfigChange(dto.getClave(), oldValue, dto.getValor(), username);

        return ResponseEntity.ok("Configuración actualizada: " + dto.getClave());
    }

    /**
     * Restaura todas las configuraciones a valores por defecto
     */
    @PostMapping("/reset-defaults")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR')")
    public ResponseEntity<String> resetToDefaults() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        configuracionService.resetToDefaults();
        auditLogService.logConfigResetToDefaults(username);

        return ResponseEntity.ok("Configuraciones restauradas a valores por defecto.");
    }

    @GetMapping("/historial/{clave}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'OPERADOR')")
    public ResponseEntity<List<AuditLog>> getHistorial(@PathVariable String clave,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(auditLogService.getConfigChangeHistory(clave, page, size));
    }

    @GetMapping("/ultima-mod")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR', 'OPERADOR')")
    public ResponseEntity<AuditLog> getUltimaMod() {
        AuditLog lastLog = auditLogService.getUltimaModificacionConfig();
        return lastLog != null ? ResponseEntity.ok(lastLog) : ResponseEntity.noContent().build();
    }
}

// DTO para update
class ConfigUpdateDTO {
    private String clave;
    private Object valor;

    public boolean isValid() {
        return clave != null && !clave.trim().isEmpty() && valor != null;
    }

    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    public Object getValor() {
        return valor;
    }

    public void setValor(Object valor) {
        this.valor = valor;
    }
}
