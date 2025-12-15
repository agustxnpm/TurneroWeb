package unpsjb.labprog.backend.presenter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.data.domain.Page;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.OperadorService;
import unpsjb.labprog.backend.config.AuditContext;
import unpsjb.labprog.backend.config.TenantContext;
import unpsjb.labprog.backend.dto.OperadorDTO;
import java.util.Optional;

@RestController
@RequestMapping("operadores")
public class OperadorPresenter {

    @Autowired
    private OperadorService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Object> findAll() {
        List<OperadorDTO> operadores = service.findAll();
        return Response.ok(operadores, "Operadores recuperados correctamente");
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> findById(@PathVariable Long id) {
        Optional<OperadorDTO> opt = service.findById(id);
        if (opt.isPresent()) {
            // Validar acceso multi-tenant
            Integer currentCentro = TenantContext.getCurrentCentroId();
            boolean hasGlobalAccess = TenantContext.hasGlobalAccess();
            
            if (!hasGlobalAccess) {
                if (currentCentro == null) {
                    return Response.forbidden("Usuario sin centro asignado no puede realizar esta operación");
                }
                Integer opCentro = opt.get().getCentroAtencionId();
                if (opCentro != null && !opCentro.equals(currentCentro)) {
                    return Response.forbidden("No tiene permiso para ver operadores de otro centro");
                }
            }
            return Response.ok(opt.get(), "Operador encontrado");
        }
        return Response.notFound("Operador con id " + id + " no encontrado");
    }

    @PutMapping
    public ResponseEntity<Object> update(@RequestBody OperadorDTO operadorDTO) {
        try {
            if (operadorDTO.getId() == null || operadorDTO.getId() <= 0) {
                return Response.error(null, "Debe proporcionar un ID válido para actualizar");
            }
            
            // Validar acceso multi-tenant
            Integer currentCentro = TenantContext.getCurrentCentroId();
            boolean hasGlobalAccess = TenantContext.hasGlobalAccess();
            
            if (!hasGlobalAccess) {
                if (currentCentro == null) {
                    return Response.forbidden("Usuario sin centro asignado no puede realizar esta operación");
                }
                Optional<OperadorDTO> existing = service.findById(operadorDTO.getId());
                if (existing.isPresent()) {
                    Integer opCentro = existing.get().getCentroAtencionId();
                    if (opCentro != null && !opCentro.equals(currentCentro)) {
                        return Response.forbidden("No tiene permiso para modificar operadores de otro centro");
                    }
                } else {
                    return Response.notFound("Operador no encontrado");
                }
            }

            String performedBy = AuditContext.getCurrentUser();
            OperadorDTO updated = service.saveOrUpdate(operadorDTO, performedBy);
            return Response.ok(updated, "Operador actualizado correctamente");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al actualizar el operador: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> updateById(@PathVariable Long id, @RequestBody OperadorDTO operadorDTO) {
        try {
            // Validar acceso multi-tenant
            Integer currentCentro = TenantContext.getCurrentCentroId();
            boolean hasGlobalAccess = TenantContext.hasGlobalAccess();
            
            // Si el usuario NO tiene acceso global, DEBE tener un centro asignado
            if (!hasGlobalAccess) {
                if (currentCentro == null) {
                    return Response.forbidden("Usuario sin centro asignado no puede realizar esta operación");
                }
                
                Optional<OperadorDTO> existing = service.findById(id);
                if (existing.isPresent()) {
                    Integer opCentro = existing.get().getCentroAtencionId();
                    if (opCentro != null && !opCentro.equals(currentCentro)) {
                        return Response.forbidden("No tiene permiso para modificar operadores de otro centro");
                    }
                } else {
                    return Response.notFound("Operador no encontrado");
                }
            }

            // Asegurar que el ID del path coincida con el del DTO
            operadorDTO.setId(id);
            String performedBy = AuditContext.getCurrentUser();
            OperadorDTO updated = service.saveOrUpdate(operadorDTO, performedBy);
            return Response.ok(updated, "Operador actualizado correctamente");
        } catch (IllegalArgumentException | IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al actualizar el operador: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Long id) {
        try {
            // Validar acceso multi-tenant
            Integer currentCentro = TenantContext.getCurrentCentroId();
            boolean hasGlobalAccess = TenantContext.hasGlobalAccess();
            
            // Si el usuario NO tiene acceso global, DEBE tener un centro asignado
            if (!hasGlobalAccess) {
                if (currentCentro == null) {
                    return Response.forbidden("Usuario sin centro asignado no puede realizar esta operación");
                }
                
                Optional<OperadorDTO> existing = service.findById(id);
                if (existing.isPresent()) {
                    Integer opCentro = existing.get().getCentroAtencionId();
                    if (opCentro != null && !opCentro.equals(currentCentro)) {
                        return Response.forbidden("No tiene permiso para eliminar operadores de otro centro");
                    }
                } else {
                    return Response.notFound("Operador no encontrado");
                }
            }

            String performedBy = AuditContext.getCurrentUser();
            service.delete(id, performedBy);
            return Response.ok(null, "Operador eliminado correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al eliminar el operador: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}/logico")
    public ResponseEntity<Object> deleteLogico(@PathVariable Long id) {
        try {
            service.deleteLogico(id);
            return Response.ok(null, "Operador desactivado correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al desactivar el operador: " + e.getMessage());
        }
    }

    @GetMapping("/dni/{dni}")
    public ResponseEntity<Object> findByDni(@PathVariable Long dni) {
        return service.findByDni(dni)
                .map(operador -> Response.ok(operador, "Operador encontrado por DNI"))
                .orElse(Response.notFound("Operador con DNI " + dni + " no encontrado"));
    }

    /**
     * Endpoint para obtener el operador por email
     * GET /operadores/by-email/{email}
     */
    @GetMapping("/by-email/{email}")
    public ResponseEntity<Object> findByEmail(@PathVariable String email) {
        return service.findByEmail(email)
                .map(operador -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("operadorId", operador.getId());
                    response.put("nombre", operador.getNombre());
                    response.put("apellido", operador.getApellido());
                    response.put("email", operador.getEmail());
                    response.put("activo", operador.isActivo());
                    return Response.ok(response, "Operador encontrado por email");
                })
                .orElse(Response.notFound("Operador con email " + email + " no encontrado"));
    }

    /**
     * Obtener operadores activos
     * GET /operadores/activos
     */
    @GetMapping("/activos")
    public ResponseEntity<Object> findActiveOperators() {
        try {
            List<OperadorDTO> operadores = service.findAll().stream()
                    .filter(OperadorDTO::isActivo)
                    .toList();
            return Response.ok(operadores, "Operadores activos recuperados correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar operadores activos: " + e.getMessage());
        }
    }

    /**
     * Obtener operadores inactivos
     * GET /operadores/inactivos
     */
    @GetMapping("/inactivos")
    public ResponseEntity<Object> findInactiveOperators() {
        try {
            List<OperadorDTO> operadores = service.findAll().stream()
                    .filter(op -> !op.isActivo())
                    .toList();
            return Response.ok(operadores, "Operadores inactivos recuperados correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar operadores inactivos: " + e.getMessage());
        }
    }

    /**
     * Obtener operadores paginados con filtros y ordenamiento dinámico
     * GET /operadores/page?page=0&size=10&nombre=Juan&email=juan@example.com&estado=activo&sortBy=nombre&sortDir=asc
     */
    @GetMapping("/page")
    public ResponseEntity<Object> findByPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        try {
            Page<OperadorDTO> pageResult = service.findByPage(page, size, nombre, email, estado, sortBy, sortDir);
            Map<String, Object> response = Map.of(
                "content", pageResult.getContent(),
                "totalPages", pageResult.getTotalPages(),
                "totalElements", pageResult.getTotalElements(),
                "currentPage", pageResult.getNumber()
            );
            return Response.ok(response, "Operadores recuperados correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar operadores paginados: " + e.getMessage());
        }
    }
}
