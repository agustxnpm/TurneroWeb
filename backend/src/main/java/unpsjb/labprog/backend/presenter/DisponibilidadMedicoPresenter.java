package unpsjb.labprog.backend.presenter;

import java.util.HashMap;
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
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.DisponibilidadMedicoService;
import unpsjb.labprog.backend.dto.DisponibilidadMedicoDTO;

@RestController
@RequestMapping("/api/disponibilidades-medico")
public class DisponibilidadMedicoPresenter {

    @Autowired
    private DisponibilidadMedicoService service;

    @GetMapping
    public ResponseEntity<Object> findAll() {
        List<DisponibilidadMedicoDTO> disponibilidades = service.findAll();
        return Response.ok(disponibilidades, "Disponibilidades recuperadas correctamente");
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> findById(@PathVariable Integer id) {
        return service.findById(id)
                .map(disponibilidad -> Response.ok(disponibilidad, "Disponibilidad encontrada"))
                .orElse(Response.notFound("Disponibilidad con id " + id + " no encontrada"));
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody DisponibilidadMedicoDTO disponibilidadDTO) {
        try {
            if (disponibilidadDTO.getStaffMedicoId() == null) {
                return Response.error(null, "El campo staffMedicoId es obligatorio");
            }
            DisponibilidadMedicoDTO saved = service.saveOrUpdate(disponibilidadDTO);
            return Response.ok(saved, "Disponibilidad creada correctamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al crear la disponibilidad: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable Integer id, @RequestBody DisponibilidadMedicoDTO disponibilidadDTO) {
        try {
            if (id == null || id <= 0) {
                return Response.error(null, "Debe proporcionar un ID válido para actualizar");
            }
            // Ensure the DTO has the correct ID from the path variable
            disponibilidadDTO.setId(id);
            DisponibilidadMedicoDTO updated = service.saveOrUpdate(disponibilidadDTO);
            return Response.ok(updated, "Disponibilidad actualizada correctamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al actualizar la disponibilidad: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Integer id) {
        try {
            service.deleteById(id);
            return Response.ok(null, "Disponibilidad eliminada correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al eliminar la disponibilidad: " + e.getMessage());
        }
    }

    @GetMapping("/staffMedico/{staffMedicoId}")
    public ResponseEntity<Object> findByStaffMedico(@PathVariable Integer staffMedicoId) {
        try {
            List<DisponibilidadMedicoDTO> disponibilidades = service.findByStaffMedicoId(staffMedicoId);
            return Response.ok(disponibilidades, "Disponibilidades del staff médico recuperadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener disponibilidades del staff médico: " + e.getMessage());
        }
    }

    @GetMapping("/medico/{medicoId}")
    public ResponseEntity<Object> findByMedico(@PathVariable Integer medicoId) {
        try {
            List<DisponibilidadMedicoDTO> disponibilidades = service.findByMedicoId(medicoId);
            return Response.ok(disponibilidades, "Disponibilidades del médico recuperadas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener disponibilidades del médico: " + e.getMessage());
        }
    }

    @RequestMapping(value = "/page", method = RequestMethod.GET)
    public ResponseEntity<Object> findByPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String staffMedico,    // búsqueda parcial por nombre/apellido de Staff Médico
            @RequestParam(required = false) String especialidad,   // búsqueda parcial por nombre de Especialidad (opcional)
            @RequestParam(required = false) String dia,            // filtro por día de la semana (ej. LUNES)
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        var pageResult = service.findByPage(page, size, staffMedico, especialidad, dia, sortBy, sortDir);

        Map<String, Object> response = new HashMap<>();
        response.put("content", pageResult.getContent());
        response.put("totalPages", pageResult.getTotalPages());
        response.put("totalElements", pageResult.getTotalElements());
        response.put("currentPage", pageResult.getNumber());

        return Response.ok(response);
    }
}