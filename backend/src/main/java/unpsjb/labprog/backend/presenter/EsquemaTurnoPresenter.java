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
import unpsjb.labprog.backend.business.service.EsquemaTurnoService;
import unpsjb.labprog.backend.dto.EsquemaTurnoDTO;

@RestController
@RequestMapping("/api/esquema-turno")
public class EsquemaTurnoPresenter {

    @Autowired
    private EsquemaTurnoService service;

    @GetMapping
    public ResponseEntity<Object> getAll() {
        try {
            List<EsquemaTurnoDTO> esquemas = service.findAll();
            return Response.ok(esquemas, "Esquemas de turno obtenidos correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener los esquemas de turno: " + e.getMessage());
        }
    }

    @GetMapping("/all")
    public ResponseEntity<Object> getAllEsquemas() {
        try {
            List<EsquemaTurnoDTO> esquemas = service.findAll();
            return Response.ok(esquemas, "Todos los esquemas de turno obtenidos correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener todos los esquemas de turno: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable Integer id) {
        return service.findById(id)
                .map(esquema -> Response.ok(esquema, "Esquema de turno obtenido correctamente"))
                .orElse(Response.error(null, "Esquema de turno no encontrado"));
    }

    @GetMapping("/staff/{staffMedicoId}")
    public ResponseEntity<Object> getByStaffMedico(@PathVariable Integer staffMedicoId) {
        try {
            List<EsquemaTurnoDTO> esquemas = service.findByStaffMedico(staffMedicoId);
            return Response.ok(esquemas, "Esquemas de turno obtenidos correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener los esquemas de turno: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody EsquemaTurnoDTO esquemaTurnoDTO) {
        try {
            EsquemaTurnoDTO saved = service.saveOrUpdate(esquemaTurnoDTO);
            return Response.ok(saved, "Esquema de turno creado correctamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al crear el esquema de turno: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable Integer id, @RequestBody EsquemaTurnoDTO esquemaTurnoDTO) {
        try {
            esquemaTurnoDTO.setId(id);
            EsquemaTurnoDTO updated = service.saveOrUpdate(esquemaTurnoDTO);
            return Response.ok(updated, "Esquema de turno actualizado correctamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al actualizar el esquema de turno: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Integer id) {
        try {
            if (service.findById(id).isPresent()) {
                service.deleteById(id);
                return Response.ok(null, "Esquema de turno eliminado correctamente");
            }
            return Response.error(null, "Esquema de turno no encontrado");
        } catch (Exception e) {
            return Response.error(null, "Error al eliminar el esquema de turno: " + e.getMessage());
        }
    }

    // Nuevos endpoints para centros de atencion
    @GetMapping("/centrosAtencion/{centroId}/esquemas")
    public ResponseEntity<Object> getByCentroAtencion(@PathVariable Integer centroId) {
        try {
            List<EsquemaTurnoDTO> esquemas = service.findByCentroAtencion(centroId);
            return Response.ok(esquemas, "Esquemas de turno del centro obtenidos correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener los esquemas del centro: " + e.getMessage());
        }
    }

    @GetMapping("/centrosAtencion/{centroId}/esquemas/disponibles")
    public ResponseEntity<Object> getDisponiblesByCentroAtencion(@PathVariable Integer centroId) {
        try {
            List<EsquemaTurnoDTO> esquemas = service.findDisponiblesByCentroAtencion(centroId);
            return Response.ok(esquemas, "Esquemas disponibles del centro obtenidos correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al obtener los esquemas disponibles del centro: " + e.getMessage());
        }
    }

    @GetMapping("/search/{term}")
    public ResponseEntity<Object> search(@PathVariable String term) {
        try {
            List<EsquemaTurnoDTO> esquemas = service.search(term);
            return Response.ok(esquemas, "Busqueda completada correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al realizar la busqueda: " + e.getMessage());
        }
    }

    @GetMapping("/page")
    public ResponseEntity<Object> findByPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String staffMedico,
            @RequestParam(required = false) String consultorio,
            @RequestParam(required = false) String centro,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        try {
            var pageResult = service.findByPage(page, size, staffMedico, consultorio, centro, sortBy, sortDir);

            var response = Map.of(
                    "content", pageResult.getContent(),
                    "totalPages", pageResult.getTotalPages(),
                    "totalElements", pageResult.getTotalElements(),
                    "currentPage", pageResult.getNumber(),
                    "size", pageResult.getSize(),
                    "numberOfElements", pageResult.getNumberOfElements(),
                    "first", pageResult.isFirst(),
                    "last", pageResult.isLast());

            return Response.ok(response, "Esquemas de turno encontrados correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al buscar esquemas de turno: " + e.getMessage());
        }
    }

    /**
     * Redistribuir esquemas de turno existentes de un centro según porcentajes
     */
    @PostMapping("/centrosAtencion/{centroId}/redistribuir")
    public ResponseEntity<Object> redistribuirEsquemas(@PathVariable Integer centroId) {
        try {
            int esquemasProcesados = service.redistribuirEsquemasPorCentro(centroId);
            return Response.ok(esquemasProcesados, 
                "Redistribución completada. " + esquemasProcesados + " esquemas procesados.");
        } catch (IllegalArgumentException e) {
            return Response.error(null, e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al redistribuir esquemas: " + e.getMessage());
        }
    }

    /**
     * Redistribuir esquemas de turno de un médico específico
     */
    @PostMapping("/medico/{medicoId}/redistribuir")
    public ResponseEntity<Object> redistribuirEsquemasPorMedico(@PathVariable Integer medicoId) {
        try {
            int esquemasProcesados = service.redistribuirEsquemasPorMedico(medicoId);
            return Response.ok(esquemasProcesados, 
                "Redistribución completada para el médico. " + esquemasProcesados + " esquemas procesados.");
        } catch (IllegalArgumentException e) {
            return Response.error(null, e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error al redistribuir esquemas del médico: " + e.getMessage());
        }
    }

    @PostMapping("/validar-conflictos")
    public ResponseEntity<Object> validarConflictos(@RequestBody EsquemaTurnoDTO dto) {
        try {
            Map<String, Object> resultado = service.validarConflictos(dto);
            
            if ((Boolean) resultado.get("valido")) {
                return Response.ok(resultado, "Validación completada sin conflictos");
            } else {
                return Response.ok(resultado, "Se encontraron conflictos en la validación");
            }
        } catch (Exception e) {
            return Response.error(null, "Error al validar conflictos: " + e.getMessage());
        }
    }
}