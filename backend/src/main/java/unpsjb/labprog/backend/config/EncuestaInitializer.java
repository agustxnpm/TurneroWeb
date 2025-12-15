package unpsjb.labprog.backend.config;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.EncuestaPlantillaRepository;
import unpsjb.labprog.backend.business.repository.PreguntaRepository;
import unpsjb.labprog.backend.model.EncuestaPlantilla;
import unpsjb.labprog.backend.model.Pregunta;
import unpsjb.labprog.backend.model.TipoPregunta;

@Component
@Order(2) // Se ejecuta después del AdminInitializer
public class EncuestaInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(EncuestaInitializer.class);

    @Autowired
    private PreguntaRepository preguntaRepository;

    @Autowired
    private EncuestaPlantillaRepository plantillaRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        crearEncuestaBaseSiNoExiste();
    }

    private void crearEncuestaBaseSiNoExiste() {
        String nombrePlantilla = "Encuesta de Satisfacción General (Base)";

        // 1. Verificar si ya existe para no duplicar
        if (plantillaRepository.findByNombre(nombrePlantilla).isPresent()) {
            logger.info("✅ La plantilla de encuesta base ya existe.");
            return;
        }

        logger.info("📝 Creando preguntas y plantilla base de encuesta...");

        // 2. Crear Preguntas Base (Standard de la industria)

        // NPS (Net Promoter Score)
        Pregunta nps = new Pregunta();
        nps.setTipo(TipoPregunta.NPS);
        nps.setTextoPregunta(
                "En una escala del 0 al 10, ¿qué tan probable es que recomiendes nuestro centro de salud a un amigo o familiar?");

        // CSAT (Satisfacción General)
        Pregunta csat = new Pregunta();
        csat.setTipo(TipoPregunta.CSAT);
        csat.setTextoPregunta("¿Cómo calificarías tu satisfacción general con la atención recibida hoy?");

        // Tiempo de Espera
        Pregunta espera = new Pregunta();
        espera.setTipo(TipoPregunta.RATING_ESPERA);
        espera.setTextoPregunta("¿Cómo evaluarías el tiempo que tuviste que esperar para ser atendido?");

        // Trato del Personal
        Pregunta trato = new Pregunta();
        trato.setTipo(TipoPregunta.RATING_TRATO);
        trato.setTextoPregunta("¿Cómo calificarías el trato y la amabilidad del profesional que te atendió?");

        // Texto Libre (Feedback cualitativo)
        Pregunta feedback = new Pregunta();
        feedback.setTipo(TipoPregunta.TEXTO_LIBRE);
        feedback.setTextoPregunta("¿Tenés alguna sugerencia o comentario adicional para ayudarnos a mejorar?");

        // Guardamos las preguntas primero
        List<Pregunta> preguntasGuardadas = preguntaRepository.saveAll(List.of(nps, csat, espera, trato, feedback));

        // 3. Crear la Plantilla y asociar las preguntas
        EncuestaPlantilla plantilla = new EncuestaPlantilla();
        plantilla.setNombre(nombrePlantilla);

        // Al dejar centroAtencion y especialidad en NULL, la convertimos en una
        // plantilla "Global" o "System Default"
        plantilla.setCentroAtencion(null);
        plantilla.setEspecialidad(null);

        // Asignar preguntas
        Set<Pregunta> setPreguntas = new HashSet<>(preguntasGuardadas);
        plantilla.setPreguntas(setPreguntas);

        plantillaRepository.save(plantilla);

        logger.info("✨ Plantilla base creada exitosamente con {} preguntas.", setPreguntas.size());
    }
}