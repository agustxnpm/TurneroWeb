package unpsjb.labprog.backend.presenter;

import java.util.List;

import unpsjb.labprog.backend.business.repository.CentroAtencionRepository;
import unpsjb.labprog.backend.business.repository.EspecialidadRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.service.EncuestaService;
import unpsjb.labprog.backend.model.EncuestaPlantilla;
import unpsjb.labprog.backend.model.Pregunta;

@RestController
@RequestMapping("admin/encuestas")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class EncuestaAdminPresenter {

    @Autowired
    private EncuestaService service;

    @Autowired
    private CentroAtencionRepository centroRepo;

    @Autowired
    private EspecialidadRepository especialidadRepo;

    // === Preguntas ===
    @GetMapping("/preguntas")
    public ResponseEntity<Object> listarPreguntas() {
        List<Pregunta> list = service.listarPreguntas();
        return Response.ok(list, "Preguntas recuperadas");
    }

    @PostMapping("/preguntas")
    public ResponseEntity<Object> crearPregunta(@RequestBody Pregunta p) {
        Pregunta saved = service.crearPregunta(p);
        return Response.ok(saved, "Pregunta creada");
    }

    @PutMapping("/preguntas/{id}")
    public ResponseEntity<Object> actualizarPregunta(@PathVariable Integer id, @RequestBody Pregunta p) {
        p.setId(id);
        Pregunta saved = service.crearPregunta(p);
        return Response.ok(saved, "Pregunta actualizada");
    }

    @DeleteMapping("/preguntas/{id}")
    public ResponseEntity<Object> eliminarPregunta(@PathVariable Integer id) {
        service.eliminarPregunta(id);
        return Response.ok(null, "Pregunta eliminada");
    }

    // === Plantillas ===
    @GetMapping("/plantillas")
    public ResponseEntity<Object> listarPlantillas() {
        List<EncuestaPlantilla> list = service.listarPlantillas();
        return Response.ok(list, "Plantillas recuperadas");
    }

    @PostMapping("/plantillas")
    public ResponseEntity<Object> crearPlantilla(@RequestBody EncuestaPlantilla p) {
        EncuestaPlantilla saved = service.crearPlantilla(p);
        return Response.ok(saved, "Plantilla creada");
    }

    @PutMapping("/plantillas/{id}")
    public ResponseEntity<Object> actualizarPlantilla(@PathVariable Integer id, @RequestBody EncuestaPlantilla p) {
        p.setId(id);
        EncuestaPlantilla saved = service.crearPlantilla(p);
        return Response.ok(saved, "Plantilla actualizada");
    }

    @DeleteMapping("/plantillas/{id}")
    public ResponseEntity<Object> eliminarPlantilla(@PathVariable Integer id) {
        service.eliminarPlantilla(id);
        return Response.ok(null, "Plantilla eliminada");
    }

    @PostMapping("/plantillas/{id}/preguntas/{preguntaId}")
    public ResponseEntity<Object> agregarPreguntaAPlantilla(@PathVariable Integer id,
            @PathVariable Integer preguntaId) {
        EncuestaPlantilla saved = service.agregarPreguntaAPlantilla(id, preguntaId);
        return Response.ok(saved, "Pregunta agregada a la plantilla");
    }

    @DeleteMapping("/plantillas/{id}/preguntas/{preguntaId}")
    public ResponseEntity<Object> removerPreguntaDePlantilla(@PathVariable Integer id,
            @PathVariable Integer preguntaId) {
        EncuestaPlantilla saved = service.removerPreguntaDePlantilla(id, preguntaId);
        return Response.ok(saved, "Pregunta removida de la plantilla");
    }

    @PostMapping("/plantillas/{id}/asignar-centro/{centroId}")
    public ResponseEntity<Object> asignarPlantillaACentro(@PathVariable Integer id, @PathVariable Integer centroId) {
        var centro = centroRepo.findById(centroId).orElseThrow();
        EncuestaPlantilla saved = service.asignarAConsultorio(id, centro);
        return Response.ok(saved, "Plantilla asignada al centro");
    }

    @PostMapping("/plantillas/{id}/asignar-especialidad/{espId}")
    public ResponseEntity<Object> asignarPlantillaAEspecialidad(@PathVariable Integer id, @PathVariable Integer espId) {
        var esp = especialidadRepo.findById(espId).orElseThrow();
        EncuestaPlantilla saved = service.asignarAEspecialidad(id, esp);
        return Response.ok(saved, "Plantilla asignada a la especialidad");
    }

    @PostMapping("/plantillas/{id}/desasignar")
    public ResponseEntity<Object> desasignarPlantilla(@PathVariable Integer id) {
        EncuestaPlantilla saved = service.desasignarPlantilla(id);
        return Response.ok(saved, "Plantilla desasignada (centro y especialidad removidos)");
    }
}
