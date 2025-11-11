package unpsjb.labprog.backend.business.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.EncuestaPlantillaRepository;
import unpsjb.labprog.backend.business.repository.EncuestaRespuestaRepository;
import unpsjb.labprog.backend.business.repository.PreguntaRepository;
import unpsjb.labprog.backend.business.repository.TurnoRepository;
import unpsjb.labprog.backend.dto.EncuestaRespuestaInputDTO;
import unpsjb.labprog.backend.dto.EncuestaRespuestaInputDTO.RespuestaInputDTO;
import unpsjb.labprog.backend.model.CentroAtencion;
import unpsjb.labprog.backend.model.EncuestaPlantilla;
import unpsjb.labprog.backend.model.EncuestaRespuesta;
import unpsjb.labprog.backend.model.Paciente;
import unpsjb.labprog.backend.model.Pregunta;
import unpsjb.labprog.backend.model.Turno;

@Service
@Transactional
public class EncuestaService {

    @Autowired
    private PreguntaRepository preguntaRepository;

    @Autowired
    private EncuestaPlantillaRepository plantillaRepository;

    @Autowired
    private EncuestaRespuestaRepository respuestaRepository;

    @Autowired
    private TurnoRepository turnoRepository;

    // === Preguntas CRUD ===
    public Pregunta crearPregunta(Pregunta p) {
        return preguntaRepository.save(p);
    }

    public List<Pregunta> listarPreguntas() {
        return preguntaRepository.findAll();
    }

    public Optional<Pregunta> findPreguntaById(Integer id) {
        return preguntaRepository.findById(id);
    }

    public void eliminarPregunta(Integer id) {
        preguntaRepository.deleteById(id);
    }

    // === Plantillas CRUD ===
    public EncuestaPlantilla crearPlantilla(EncuestaPlantilla p) {
        return plantillaRepository.save(p);
    }

    public List<EncuestaPlantilla> listarPlantillas() {
        return plantillaRepository.findAll();
    }

    public Optional<EncuestaPlantilla> findPlantillaById(Integer id) {
        return plantillaRepository.findById(id);
    }

    public void eliminarPlantilla(Integer id) {
        plantillaRepository.deleteById(id);
    }

    public EncuestaPlantilla asignarAConsultorio(Integer plantillaId, CentroAtencion centro) {
        EncuestaPlantilla p = plantillaRepository.findById(plantillaId).orElseThrow();
        p.setCentroAtencion(centro);
        return plantillaRepository.save(p);
    }

    public EncuestaPlantilla asignarAEspecialidad(Integer plantillaId, unpsjb.labprog.backend.model.Especialidad esp) {
        EncuestaPlantilla p = plantillaRepository.findById(plantillaId).orElseThrow();
        p.setEspecialidad(esp);
        return plantillaRepository.save(p);
    }

    public EncuestaPlantilla agregarPreguntaAPlantilla(Integer plantillaId, Integer preguntaId) {
        EncuestaPlantilla p = plantillaRepository.findById(plantillaId).orElseThrow();
        Pregunta pregunta = preguntaRepository.findById(preguntaId).orElseThrow();
        Set<Pregunta> preguntas = p.getPreguntas();
        if (preguntas == null) {
            preguntas = new java.util.HashSet<>();
            p.setPreguntas(preguntas);
        }
        preguntas.add(pregunta);
        return plantillaRepository.save(p);
    }

    public EncuestaPlantilla removerPreguntaDePlantilla(Integer plantillaId, Integer preguntaId) {
        EncuestaPlantilla p = plantillaRepository.findById(plantillaId).orElseThrow();
        Pregunta pregunta = preguntaRepository.findById(preguntaId).orElseThrow();
        Set<Pregunta> preguntas = p.getPreguntas();
        if (preguntas != null) {
            preguntas.remove(pregunta);
        }
        return plantillaRepository.save(p);
    }

    public EncuestaPlantilla desasignarPlantilla(Integer plantillaId) {
        EncuestaPlantilla p = plantillaRepository.findById(plantillaId).orElseThrow();
        p.setCentroAtencion(null);
        p.setEspecialidad(null);
        return plantillaRepository.save(p);
    }

    // Obtener la plantilla más específica para un turno
    @Transactional(readOnly = true)
    public Optional<EncuestaPlantilla> getPlantillaForTurno(Integer turnoId) {
        Turno turno = turnoRepository.findById(turnoId).orElseThrow();

        CentroAtencion centro = turno.getCentroAtencion();
        var especialidad = turno.getEspecialidad();

        // Prioridad: Especialidad+Centro > Centro > Especialidad > Default (sin filtro)
        if (especialidad != null && centro != null) {
            var list = plantillaRepository.findByEspecialidadAndCentroAtencion(especialidad, centro);
            if (!list.isEmpty())
                return Optional.of(list.get(0));
        }
        if (centro != null) {
            var list = plantillaRepository.findByCentroAtencion(centro);
            if (!list.isEmpty())
                return Optional.of(list.get(0));
        }
        if (especialidad != null) {
            var list = plantillaRepository.findByEspecialidad(especialidad);
            if (!list.isEmpty())
                return Optional.of(list.get(0));
        }

        var defaults = plantillaRepository.findByCentroAtencionIsNullAndEspecialidadIsNull();
        if (!defaults.isEmpty())
            return Optional.of(defaults.get(0));

        return Optional.empty();
    }

    /**
     * Indica si existe una encuesta pendiente para el turno (hay plantilla asignada
     * y
     * no hay respuestas registradas aún)
     */
    @Transactional(readOnly = true)
    public boolean isEncuestaPendiente(Integer turnoId) {
        // Verificar existencia de plantilla
        Optional<EncuestaPlantilla> plantillaOpt = getPlantillaForTurno(turnoId);
        if (plantillaOpt.isEmpty()) {
            return false;
        }

        // Si ya existe al menos una respuesta para ese turno, no está pendiente
        boolean tieneRespuestas = respuestaRepository.existsByTurno_Id(turnoId);
        return !tieneRespuestas;
    }

    // Guardar respuestas de encuesta
    // Devuelve la cantidad de respuestas guardadas (útil para debug y verificación)
    public int guardarRespuestas(EncuestaRespuestaInputDTO dto) {
        Turno turno = turnoRepository.findById(dto.getTurnoId()).orElseThrow();
        Paciente paciente = turno.getPaciente();

        int saved = 0;
        if (dto.getRespuestas() == null || dto.getRespuestas().isEmpty()) {
            System.out.println("[EncuestaService] ⚠️  No hay respuestas para guardar");
            return 0;
        }

        for (RespuestaInputDTO r : dto.getRespuestas()) {
            try {
                Pregunta pregunta = preguntaRepository.findById(r.getPreguntaId())
                        .orElseThrow(() -> new RuntimeException("Pregunta no encontrada: " + r.getPreguntaId()));

                EncuestaRespuesta er = new EncuestaRespuesta();
                er.setTurno(turno);
                er.setPaciente(paciente);
                er.setPregunta(pregunta);

                // Asignar valores (puede ser numérico O texto, no ambos)
                er.setValorNumerico(r.getValorNumerico());
                er.setValorTexto(r.getValorTexto());

                respuestaRepository.save(er);
                saved++;

                System.out.println(String.format(
                        "[EncuestaService] ✅ Guardada respuesta: turno=%d, pregunta=%d, valorNum=%s, valorTxt=%s",
                        dto.getTurnoId(), r.getPreguntaId(), r.getValorNumerico(), r.getValorTexto()));
            } catch (Exception e) {
                System.err.println("[EncuestaService] ❌ Error guardando respuesta: " + e.getMessage());
                throw e; // Re-lanzar para que el controller maneje el error
            }
        }

        System.out.println(String.format(
                "[EncuestaService] 📊 Total respuestas guardadas: %d para turnoId=%d", saved, dto.getTurnoId()));
        return saved;
    }

}
