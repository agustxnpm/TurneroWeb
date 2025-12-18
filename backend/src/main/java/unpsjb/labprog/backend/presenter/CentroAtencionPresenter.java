package unpsjb.labprog.backend.presenter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.CentroAtencionService;
import unpsjb.labprog.backend.dto.CentroAtencionDTO;
import unpsjb.labprog.backend.config.AuditContext;

@RestController
@RequestMapping("/api/centrosAtencion")
public class CentroAtencionPresenter {

    @Autowired
    private CentroAtencionService service;

    @Autowired
    private ObjectMapper objectMapper;

    @RequestMapping(method = RequestMethod.GET)
    public ResponseEntity<Object> findAll() {
        List<CentroAtencionDTO> dtos = service.findAll();
        return Response.ok(dtos, "Centros de atención recuperados correctamente");
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.GET)
    public ResponseEntity<Object> findById(@PathVariable("id") Integer id) {
        Optional<CentroAtencionDTO> optionalCentro = service.findById(id);
        if (optionalCentro.isEmpty()) {
            return Response.notFound("Centro de atención id " + id + " no encontrado");
        }
        return Response.ok(optionalCentro.get(), "Centro de atención encontrado");
    }

    @RequestMapping(value = "/page", method = RequestMethod.GET)
    public ResponseEntity<Object> findByPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var pageResult = service.findByPage(page, size);

        Map<String, Object> response = new HashMap<>();
        response.put("content", pageResult.getContent());
        response.put("totalPages", pageResult.getTotalPages());
        response.put("totalElements", pageResult.getTotalElements());
        response.put("currentPage", pageResult.getNumber());

        return Response.ok(response);
    }

    @RequestMapping(value = "/search/{term}", method = RequestMethod.GET)
    public ResponseEntity<Object> search(@PathVariable("term") String term) {
        List<CentroAtencionDTO> results = service.search(term);
        return Response.ok(results, "Resultados de búsqueda");
    }

    @RequestMapping(method = RequestMethod.POST)
    public ResponseEntity<Object> create(@RequestBody CentroAtencionDTO dto) {
        try {
            if (dto.getId() != null && dto.getId() != 0) {
                return Response.error(dto, "El centro de atención no puede tener un ID definido al crearse.");
            }
            String performedBy = AuditContext.getCurrentUser();
            CentroAtencionDTO saved = service.saveOrUpdate(dto, performedBy);
            return Response.ok(saved, "Centro de atención creado correctamente");
        } catch (ResponseStatusException e) {
            if (e.getStatusCode() == HttpStatus.CONFLICT) {
                return Response.dbError(e.getReason());
            }
            return Response.error(null, e.getReason());
        } catch (Exception e) {
            return Response.error(null, e.getMessage());
        }
    }

    @RequestMapping(method = RequestMethod.PUT)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Object> update(@RequestBody CentroAtencionDTO dto) {
        try {
            if (dto.getId() == null || dto.getId() <= 0) {
                return Response.error(dto, "Debe proporcionar un ID válido para actualizar.");
            }
            String performedBy = AuditContext.getCurrentUser();
            CentroAtencionDTO saved = service.saveOrUpdate(dto, performedBy);
            return Response.ok(saved, "Centro de atención modificado correctamente");
        } catch (ResponseStatusException e) {
            if (e.getStatusCode() == HttpStatus.CONFLICT) {
                return Response.dbError(e.getReason());
            }
            return Response.error(null, e.getReason());
        } catch (Exception e) {
            return Response.error(null, e.getMessage());
        }
    }

    @RequestMapping(value = "/{id}", method = RequestMethod.DELETE)
    public ResponseEntity<Object> delete(@PathVariable("id") Integer id) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            service.delete(id, performedBy);
            return Response.ok("Centro de atención " + id + " eliminado correctamente.");
        } catch (ResponseStatusException e) {
            if (e.getStatusCode() == HttpStatus.CONFLICT) {
                return Response.dbError(e.getReason());
            }
            return Response.error(null, e.getReason());
        } catch (Exception e) {
            return Response.error(null, e.getMessage());
        }
    }

    @RequestMapping(value = "/centro-especialidad", method = RequestMethod.GET)
    public ResponseEntity<Object> getAllCentroEspecialidades() {
        try {
            var result = service.getAllCentroEspecialidades();
            return Response.ok(result.get("data"), "Relaciones centro-especialidad recuperadas correctamente");
        } catch (Exception e) {
            return Response.error(null, e.getMessage());
        }
    }

}
