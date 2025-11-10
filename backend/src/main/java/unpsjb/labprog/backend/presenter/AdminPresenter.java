package unpsjb.labprog.backend.presenter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.UserService;
import unpsjb.labprog.backend.dto.RegisterRequest;
import unpsjb.labprog.backend.dto.RegisterSuccessResponse;
import unpsjb.labprog.backend.model.User;
import unpsjb.labprog.backend.model.Role;
import unpsjb.labprog.backend.config.AuditContext;

@RestController
@RequestMapping("admins")
public class AdminPresenter {

    @Autowired
    private UserService userService;

    /**
     * Obtiene la lista de todos los administradores
     */
    @GetMapping
    public ResponseEntity<Object> getAllAdmins() {
        try {
            List<User> admins = userService.findByRole(Role.ADMINISTRADOR);
            return Response.ok(admins, "Administradores recuperados exitosamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar administradores: " + e.getMessage());
        }
    }

    /**
     * Crea un nuevo administrador
     */
    @PostMapping
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
}