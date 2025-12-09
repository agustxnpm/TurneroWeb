package unpsjb.labprog.backend.presenter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import unpsjb.labprog.backend.Response;
import unpsjb.labprog.backend.business.repository.TurnoRepository;
import unpsjb.labprog.backend.business.service.EncuestaService;
import unpsjb.labprog.backend.dto.EncuestaRespuestaInputDTO;
import unpsjb.labprog.backend.dto.EncuestaPlantillaDTO;
import unpsjb.labprog.backend.dto.PreguntaDTO;
import unpsjb.labprog.backend.model.Turno;
import unpsjb.labprog.backend.model.EncuestaPlantilla;
import unpsjb.labprog.backend.model.Pregunta;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("encuestas")
public class EncuestaPacientePresenter {

    @Autowired
    private EncuestaService encuestaService;

    @Autowired
    private TurnoRepository turnoRepository;

    /**
     * Obtener la plantilla de encuesta correspondiente a un turno.
     * Pacientes solo pueden ver sus propios turnos, pero ADMIN/OPERADOR tienen acceso completo.
     */
    @GetMapping("/turno/{idTurno}")
    @PreAuthorize("hasRole('PACIENTE')") // Gracias a herencia, ADMIN y OPERADOR también pasan
    public ResponseEntity<Object> getEncuestaForTurno(@PathVariable Integer idTurno) {
        Optional<Turno> turnoOpt = turnoRepository.findById(idTurno);
        if (turnoOpt.isEmpty()) {
            return Response.notFound("Turno no encontrado");
        }

        Optional<EncuestaPlantilla> plantillaOpt = encuestaService.getPlantillaForTurno(idTurno);
        if (plantillaOpt.isEmpty()) {
            return Response.notFound("No hay una plantilla de encuesta configurada para este turno");
        }

        EncuestaPlantilla plantilla = plantillaOpt.get();
        EncuestaPlantillaDTO dto = toDto(plantilla);

        return Response.ok(dto, "Plantilla de encuesta recuperada");
    }

    /**
     * Indica si hay una encuesta pendiente para este turno (plantilla asignada y sin respuestas).
     * Gracias a herencia de roles, ADMIN y OPERADOR también tienen acceso.
     */
    @GetMapping("/turno/{idTurno}/pendiente")
    @PreAuthorize("hasRole('PACIENTE')") // Gracias a herencia, ADMIN y OPERADOR también pasan
    public ResponseEntity<Object> isEncuestaPendiente(@PathVariable Integer idTurno) {
        Optional<Turno> turnoOpt = turnoRepository.findById(idTurno);
        if (turnoOpt.isEmpty()) {
            return Response.notFound("Turno no encontrado");
        }

        boolean pendiente = encuestaService.isEncuestaPendiente(idTurno);
        java.util.Map<String, Object> map = java.util.Map.of("pending", pendiente);
        return Response.ok(map, pendiente ? "Encuesta pendiente" : "No hay encuesta pendiente");
    }

    private EncuestaPlantillaDTO toDto(EncuestaPlantilla plantilla) {
        EncuestaPlantillaDTO dto = new EncuestaPlantillaDTO();
        dto.setId(plantilla.getId());
        dto.setNombre(plantilla.getNombre());

        if (plantilla.getCentroAtencion() != null) {
            dto.setCentroAtencionId(plantilla.getCentroAtencion().getId());
        }
        if (plantilla.getEspecialidad() != null) {
            dto.setEspecialidadId(plantilla.getEspecialidad().getId());
        }

        if (plantilla.getPreguntas() != null) {
            java.util.List<PreguntaDTO> preguntas = new java.util.ArrayList<>();
            for (Pregunta p : plantilla.getPreguntas()) {
                preguntas.add(new PreguntaDTO(p.getId(), p.getTipo(), p.getTextoPregunta()));
            }
            dto.setPreguntas(preguntas);
        }

        return dto;
    }

    /**
     * Guardar respuestas de encuesta.
     * Gracias a herencia de roles, ADMIN y OPERADOR también tienen acceso.
     */
    @PostMapping("/responder")
    @PreAuthorize("hasRole('PACIENTE')") // Gracias a herencia, ADMIN y OPERADOR también pasan
    public ResponseEntity<Object> responderEncuesta(@RequestBody EncuestaRespuestaInputDTO dto) {
        // Validar turno
        Optional<Turno> turnoOpt = turnoRepository.findById(dto.getTurnoId());
        if (turnoOpt.isEmpty()) {
            return Response.notFound("Turno no encontrado");
        }

        int saved = encuestaService.guardarRespuestas(dto);
        Map<String, Object> map = Map.of("saved", saved);
        return Response.ok(map, "Respuestas recibidas correctamente");
    }

}
