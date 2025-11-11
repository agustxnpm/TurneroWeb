package unpsjb.labprog.backend.presenter;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.EspecialidadService;
import unpsjb.labprog.backend.dto.EspecialidadDTO;
import unpsjb.labprog.backend.config.AuditContext;

@RestController
@RequestMapping("especialidades")
public class EspecialidadPresenter {

    @Autowired
    EspecialidadService service;

    @GetMapping
    public ResponseEntity<Object> getAll() {
        List<EspecialidadDTO> especialidades = service.findAll();
        return Response.ok(especialidades, "Especialidades recuperadas correctamente");
    }

    @GetMapping("/page")
    public ResponseEntity<Object> getByPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            var pageResult = service.findByPage(page, size);

            var response = Map.of(
                    "content", pageResult.getContent(),
                    "totalPages", pageResult.getTotalPages(),
                    "totalElements", pageResult.getTotalElements(),
                    "currentPage", pageResult.getNumber());

            return Response.ok(response, "Especialidades paginadas recuperadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar las especialidades paginadas: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable Integer id) {
        try {
            EspecialidadDTO dto = service.findById(id);
            if (dto == null) {
                return Response.notFound("No se encontró la especialidad con id " + id);
            }
            return Response.ok(dto, "Especialidad recuperada correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar la especialidad: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody EspecialidadDTO dto) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            EspecialidadDTO saved = service.saveOrUpdate(dto, performedBy);
            return Response.ok(saved, "Especialidad creada correctamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error inesperado: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable Integer id, @RequestBody EspecialidadDTO dto) {
        try {
            dto.setId(id);
            String performedBy = AuditContext.getCurrentUser();
            EspecialidadDTO updated = service.saveOrUpdate(dto, performedBy);
            return Response.ok(updated, "Especialidad editada exitosamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error inesperado: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Integer id) {
        try {
            String performedBy = AuditContext.getCurrentUser();
            service.delete(id, performedBy);
            return Response.ok(null, "Especialidad eliminada exitosamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error inesperado: " + e.getMessage());
        }
    }

    @GetMapping("/search/{term}")
    public ResponseEntity<Object> searchEspecialidad(@PathVariable("term") String term) {
        try {
            List<EspecialidadDTO> results = service.search(term);
            return Response.ok(results, "Resultados de búsqueda de especialidades");
        } catch (Exception e) {
            return Response.error(null, "Error en la búsqueda de especialidades: " + e.getMessage());
        }
    }

    // Get especialidades no asociadas a un centro de atencion
    @GetMapping("/centrosAtencion/{centroId}/especialidades/disponibles")
    public ResponseEntity<Object> getEspecialidadesNoAsociadas(@PathVariable Integer centroId) {
        try {
            List<EspecialidadDTO> disponibles = service.findEspecialidadesNoAsociadas(centroId);
            return Response.ok(disponibles, "Especialidades no asociadas recuperadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar especialidades no asociadas: " + e.getMessage());
        }
    }

    // get especialidades asociadas a un centro de atencion
    @GetMapping("/centrosAtencion/{centroId}/especialidades")
    public ResponseEntity<Object> getByCentroAtencion(@PathVariable Integer centroId) {
        try {
            List<EspecialidadDTO> especialidades = service.findByCentroAtencionId(centroId);
            return Response.ok(especialidades, "Especialidades asociadas recuperadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar especialidades asociadas: " + e.getMessage());
        }
    }

    // get especialidades agrupadas por centro de atencion
    @GetMapping("/centrosAtencion/especialidades")
    public ResponseEntity<Object> getEspecialidadesAgrupadasPorCentro() {
        try {
            List<Map<String, Object>> agrupado = service.findEspecialidadesAgrupadasPorCentro();
            return Response.ok(agrupado, "especialidades asociadas a centros recuperadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar especialidades agrupadas: " + e.getMessage());
        }
    }

    @PostMapping("/centrosAtencion/{centroId}/especialidades/{especialidadId}")
    public ResponseEntity<Object> asociarEspecialidadExistenteACentro(
            @PathVariable Integer centroId,
            @PathVariable Integer especialidadId) {
        try {
            EspecialidadDTO result = service.asociarEspecialidadACentro(especialidadId, centroId);
            return Response.ok(result, "Especialidad asociada correctamente al centro");
        } catch (Exception e) {
            return Response.error(null, "Error al asociar especialidad al centro: " + e.getMessage());
        }
    }

    @DeleteMapping("/centrosAtencion/{centroId}/especialidades/{especialidadId}")
    public ResponseEntity<Object> desasociarEspecialidadDeCentro(
            @PathVariable Integer centroId,
            @PathVariable Integer especialidadId) {
        try {
            service.desasociarEspecialidadDeCentro(especialidadId, centroId);
            return Response.ok(null, "Especialidad desasociada correctamente del centro");
        } catch (Exception e) {
            return Response.error(null, "No se pudo desasociar la especialidad: " + e.getMessage());
        }
    }
}