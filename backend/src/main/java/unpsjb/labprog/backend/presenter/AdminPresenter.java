package unpsjb.labprog.backend.presenter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.UserService;
import unpsjb.labprog.backend.business.service.EncuestaInvitacionService;
import unpsjb.labprog.backend.dto.RegisterRequest;
import unpsjb.labprog.backend.dto.RegisterSuccessResponse;
import unpsjb.labprog.backend.model.User;
import unpsjb.labprog.backend.model.Role;
import unpsjb.labprog.backend.config.AuditContext;
import unpsjb.labprog.backend.config.TenantContext;

@RestController
@RequestMapping("admins")
public class AdminPresenter {

    @Autowired
    private UserService userService;

    @Autowired
    private EncuestaInvitacionService encuestaInvitacionService;

    /**
     * Obtiene la lista de todos los administradores
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<Object> getAllAdmins() {
        try {
            List<User> admins = userService.findByRole(Role.ADMINISTRADOR);
            return Response.ok(admins, "Administradores recuperados exitosamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar administradores: " + e.getMessage());
        }
    }

    /**
     * Crea un nuevo administrador con centro asignado.
     * Solo accesible para SUPERADMIN.
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<Object> create(@RequestBody RegisterRequest dto) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            if (performedBy == null || performedBy.trim().isEmpty()) {
                return Response.error(null, "No se pudo determinar el usuario que realiza la acción");
            }

            RegisterSuccessResponse newAdmin = userService.createAdmin(dto, performedBy);
            return Response.ok(newAdmin, "Administrador creado exitosamente");
        } catch (IllegalArgumentException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al crear administrador: " + e.getMessage());
        }
    }

    /**
     * Actualiza un administrador existente
     */
    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable Integer id, @RequestBody Map<String, Object> updates) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            if (performedBy == null || performedBy.trim().isEmpty()) {
                return Response.error(null, "No se pudo determinar el usuario que realiza la acción");
            }

            User updatedAdmin = userService.updateAdmin(id, updates, performedBy);
            return Response.ok(updatedAdmin, "Administrador actualizado exitosamente");
        } catch (IllegalArgumentException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al actualizar administrador: " + e.getMessage());
        }
    }

    /**
     * Deshabilita un administrador
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Integer id) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            if (performedBy == null || performedBy.trim().isEmpty()) {
                return Response.error(null, "No se pudo determinar el usuario que realiza la acción");
            }

            User disabledAdmin = userService.disableAdmin(id, performedBy);
            return Response.ok(disabledAdmin, "Administrador deshabilitado exitosamente");
        } catch (IllegalArgumentException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al deshabilitar administrador: " + e.getMessage());
        }
    }

    /**
     * Verifica si un email está disponible para su uso
     */
    @GetMapping("/check-email")
    public ResponseEntity<Object> checkEmailAvailability(@RequestParam String email) {
        try {
            boolean isAvailable = !userService.existsByEmail(email);
            return Response.ok(Map.of("available", isAvailable),
                    isAvailable ? "Email disponible" : "Email ya registrado");
        } catch (Exception e) {
            return Response.error(null, "Error al verificar email: " + e.getMessage());
        }
    }
    
    /**
     * Crea un nuevo operador asignado al centro del administrador que lo crea.
     * Solo accesible para ADMINISTRADOR.
     */
    @PostMapping("/operadores")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Object> createOperador(@RequestBody RegisterRequest dto) {
        try {
            Integer currentCentro = TenantContext.getCurrentCentroId();
            if (currentCentro != null) {
                if (dto.getCentroId() != null && !dto.getCentroId().equals(currentCentro)) {
                    return Response.forbidden("No puede crear operadores para otro centro");
                }
                // Asegurar que se crea en el centro correcto
                dto.setCentroId(currentCentro);
            }

            String performedBy = AuditContext.getCurrentUser();
            if (performedBy == null || performedBy.trim().isEmpty()) {
                return Response.error(null, "No se pudo determinar el usuario que realiza la acción");
            }

            RegisterSuccessResponse newOperador = userService.createOperador(dto, performedBy);
            return Response.ok(newOperador, "Operador creado exitosamente. Se ha enviado un email con las credenciales.");
        } catch (IllegalArgumentException e) {
            return Response.error(null, e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al crear operador: " + e.getMessage());
        }
    }

    /**
     * Endpoint temporal para probar el envío de invitaciones a encuestas
     * Procesa TODAS las invitaciones pendientes FORZANDO el envío (ignora timing programado)
     */
    @PostMapping("/test-encuesta-invitaciones")
    public ResponseEntity<Object> testProcesarInvitaciones() {
        try {
            encuestaInvitacionService.procesarInvitacionesPendientesForzandoEnvio();
            Map<String, Object> stats = encuestaInvitacionService.obtenerEstadisticas();
            return Response.ok(stats, "Invitaciones procesadas exitosamente (envío forzado)");
        } catch (Exception e) {
            return Response.error(null, "Error al procesar invitaciones: " + e.getMessage());
        }
}
}
