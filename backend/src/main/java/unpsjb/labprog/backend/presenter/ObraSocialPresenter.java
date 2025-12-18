package unpsjb.labprog.backend.presenter;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.ObraSocialService;
import unpsjb.labprog.backend.dto.ObraSocialDTO;

@RestController
@RequestMapping("/api/obra-social")
public class ObraSocialPresenter {

    @Autowired
    private ObraSocialService service;

    @GetMapping
    public ResponseEntity<Object> getAll() {
        List<ObraSocialDTO> obrasSociales = service.findAll();
        return Response.ok(obrasSociales, "Obras sociales recuperadas correctamente");
    }

    @GetMapping("/page")
    public ResponseEntity<Object> findByPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String codigo,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        try {
            var pageResult = service.findByPage(page, size, nombre, codigo, sortBy, sortDir);

            var response = Map.of(
                    "content", pageResult.getContent(),
                    "totalPages", pageResult.getTotalPages(),
                    "totalElements", pageResult.getTotalElements(),
                    "currentPage", pageResult.getNumber(),
                    "size", pageResult.getSize(),
                    "numberOfElements", pageResult.getNumberOfElements(),
                    "first", pageResult.isFirst(),
                    "last", pageResult.isLast());

            return Response.ok(response, "Obras sociales encontradas correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al buscar obras sociales: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable Integer id) {
        try {
            ObraSocialDTO dto = service.findById(id).orElse(null);
            if (dto == null) {
                return Response.notFound("No se encontró la obra social con id " + id);
            }
            return Response.ok(dto, "Obra social recuperada correctamente");
        } catch (Exception e) {
            return Response.error(null, "Error al recuperar la obra social: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody ObraSocialDTO dto) {
        try {
            ObraSocialDTO saved = service.saveOrUpdate(dto);
            return Response.ok(saved, "Obra social creada correctamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error inesperado: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable Integer id, @RequestBody ObraSocialDTO dto) {
        try {
            dto.setId(id);
            ObraSocialDTO updated = service.saveOrUpdate(dto);
            return Response.ok(updated, "Obra social editada exitosamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error inesperado: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Integer id) {
        try {
            service.deleteById(id);
            return Response.ok(null, "Obra social eliminada exitosamente");
        } catch (IllegalStateException e) {
            return Response.dbError(e.getMessage());
        } catch (Exception e) {
            return Response.error(null, "Error inesperado: " + e.getMessage());
        }
    }
}