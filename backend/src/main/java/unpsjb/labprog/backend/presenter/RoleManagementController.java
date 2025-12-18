package unpsjb.labprog.backend.presenter;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.AuditLogService;
import unpsjb.labprog.backend.business.service.UserService;
import unpsjb.labprog.backend.config.AuditContext;
import unpsjb.labprog.backend.dto.RoleChangeRequest;
import unpsjb.labprog.backend.model.AuditLog;
import unpsjb.labprog.backend.model.User;

/**
 * Controlador para la gestión de roles con auditoría integrada
 */
@RestController
@RequestMapping("/api/role-management")
public class RoleManagementController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuditLogService auditLogService;

    /**
     * Cambia el rol de un usuario
     */
    @PutMapping("/user/{userId}/role")
    public ResponseEntity<Object> changeUserRole(
            @PathVariable Long userId,
            @RequestBody RoleChangeRequest request) {
        try {
            // Obtener el usuario actual del contexto de auditoría
            String performedBy = AuditContext.getCurrentUser();
            if (performedBy == null) {
                performedBy = request.getPerformedBy() != null ? request.getPerformedBy() : "UNKNOWN";
            }

            User updatedUser = userService.changeUserRole(
                userId, 
                request.getNewRole(), 
                performedBy, 
                request.getReason()
            );

            return Response.ok(Map.of(
                "userId", updatedUser.getId(),
                "email", updatedUser.getEmail(),
                "newRole", updatedUser.getRole().getName(),
                "message", "Rol cambiado exitosamente"
            ), "Rol del usuario actualizado correctamente");

        } catch (IllegalArgumentException e) {
            return Response.error(null, e.getMessage());
        } catch (Exception e) {
            return Response.serverError("Error al cambiar el rol del usuario: " + e.getMessage());
        }
    }

    /**
     * Obtiene el historial de cambios de rol de un usuario
     */
    @GetMapping("/user/{userId}/role-history")
    public ResponseEntity<Object> getUserRoleHistory(@PathVariable Long userId) {
        try {
            List<AuditLog> roleChanges = auditLogService.getRoleChangesByUser(userId);
            return Response.ok(roleChanges, "Historial de cambios de rol recuperado correctamente");
        } catch (Exception e) {
            return Response.serverError("Error al obtener el historial de roles: " + e.getMessage());
        }
    }

    /**
     * Obtiene todos los cambios de rol del sistema
     */
    @GetMapping("/role-changes")
    public ResponseEntity<Object> getAllRoleChanges() {
        try {
            List<AuditLog> roleChanges = auditLogService.getAllRoleChanges();
            return Response.ok(roleChanges, "Historial completo de cambios de rol recuperado correctamente");
        } catch (Exception e) {
            return Response.serverError("Error al obtener los cambios de rol: " + e.getMessage());
        }
    }

    /**
     * Obtiene estadísticas de cambios de rol
     */
    @GetMapping("/role-statistics")
    public ResponseEntity<Object> getRoleStatistics() {
        try {
            Map<String, Object> statistics = auditLogService.getRoleChangeStatistics();
            return Response.ok(statistics, "Estadísticas de cambios de rol recuperadas correctamente");
        } catch (Exception e) {
            return Response.serverError("Error al obtener las estadísticas: " + e.getMessage());
        }
    }

    /**
     * Habilita un usuario con auditoría
     */
    @PutMapping("/user/{userId}/enable")
    public ResponseEntity<Object> enableUser(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            if (performedBy == null) {
                performedBy = request.get("performedBy") != null ? request.get("performedBy") : "UNKNOWN";
            }
            String reason = request.get("reason") != null ? request.get("reason") : "Usuario habilitado";

            userService.enableUserWithAudit(userId, performedBy, reason);

            return Response.ok(Map.of(
                "userId", userId,
                "status", "enabled",
                "message", "Usuario habilitado exitosamente"
            ), "Usuario habilitado correctamente");

        } catch (IllegalArgumentException e) {
            return Response.error(null, e.getMessage());
        } catch (Exception e) {
            return Response.serverError("Error al habilitar el usuario: " + e.getMessage());
        }
    }

    /**
     * Deshabilita un usuario con auditoría
     */
    @PutMapping("/user/{userId}/disable")
    public ResponseEntity<Object> disableUser(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            if (performedBy == null) {
                performedBy = request.get("performedBy") != null ? request.get("performedBy") : "UNKNOWN";
            }
            String reason = request.get("reason") != null ? request.get("reason") : "Usuario deshabilitado";

            userService.disableUserWithAudit(userId, performedBy, reason);

            return Response.ok(Map.of(
                "userId", userId,
                "status", "disabled",
                "message", "Usuario deshabilitado exitosamente"
            ), "Usuario deshabilitado correctamente");

        } catch (IllegalArgumentException e) {
            return Response.error(null, e.getMessage());
        } catch (Exception e) {
            return Response.serverError("Error al deshabilitar el usuario: " + e.getMessage());
        }
    }

    /**
     * Obtiene el historial completo de auditoría de un usuario
     */
    @GetMapping("/user/{userId}/audit-history")
    public ResponseEntity<Object> getUserAuditHistory(@PathVariable Long userId) {
        try {
            List<AuditLog> auditHistory = auditLogService.getUserAuditHistory(userId);
            return Response.ok(auditHistory, "Historial de auditoría del usuario recuperado correctamente");
        } catch (Exception e) {
            return Response.serverError("Error al obtener el historial de auditoría: " + e.getMessage());
        }
    }
}
