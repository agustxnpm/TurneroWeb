package unpsjb.labprog.backend.business.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.EncuestaInvitacionRepository;
import unpsjb.labprog.backend.business.repository.TurnoRepository;
import unpsjb.labprog.backend.model.EncuestaInvitacion;
import unpsjb.labprog.backend.model.EncuestaInvitacion.EstadoInvitacion;
import unpsjb.labprog.backend.model.EstadoTurno;
import unpsjb.labprog.backend.model.Paciente;
import unpsjb.labprog.backend.model.Turno;

@Service
@Transactional
public class EncuestaInvitacionService {

    private static final Logger logger = LoggerFactory.getLogger(EncuestaInvitacionService.class);

    @Autowired
    private EncuestaInvitacionRepository invitacionRepository;

    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private EncuestaService encuestaService;

    // Configuración desde application.properties
    @Value("${app.encuesta.invitacion.horas-envio-inicial:2}")
    private int horasEnvioInicial;

    @Value("${app.encuesta.invitacion.intervalo-reintento-horas:24}")
    private int intervaloReintentoHoras;

    @Value("${app.encuesta.invitacion.max-reintentos:2}")
    private int maxReintentos;

    @Value("${app.encuesta.invitacion.limite-dias-limpieza:30}")
    private int limiteDiasLimpieza;

    /**
     * Programa el envío de una invitación a encuesta cuando un turno se completa.
     * Solo crea la invitación si no existe una previa para este turno.
     */
    @Transactional
    public void programarInvitacionEncuesta(Integer turnoId) {
        try {
            // Verificar que el turno existe y está completado
            Optional<Turno> turnoOpt = turnoRepository.findById(turnoId);
            if (turnoOpt.isEmpty()) {
                logger.warn("Turno no encontrado para programar invitación: {}", turnoId);
                return;
            }

            Turno turno = turnoOpt.get();

            // Validar que el turno está completado
            if (turno.getEstado() != EstadoTurno.COMPLETO) {
                logger.warn("No se puede programar invitación para turno no completado. Turno: {}, Estado: {}",
                           turnoId, turno.getEstado());
                return;
            }

            // Verificar que no existe ya una invitación para este turno
            if (invitacionRepository.existsByTurno_Id(turnoId)) {
                logger.info("Ya existe una invitación para el turno: {}", turnoId);
                return;
            }

            // Verificar que el paciente tiene email válido
            Paciente paciente = turno.getPaciente();
            if (paciente == null || paciente.getEmail() == null || paciente.getEmail().trim().isEmpty()) {
                logger.warn("Paciente sin email válido para turno: {}", turnoId);
                return;
            }

            // Crear la invitación
            EncuestaInvitacion invitacion = new EncuestaInvitacion();
            invitacion.setTurno(turno);
            invitacion.setPaciente(paciente);
            invitacion.setEstado(EstadoInvitacion.PENDIENTE);
            invitacion.setIntervaloReintentoHoras(intervaloReintentoHoras);
            invitacion.setMaxIntentosReintento(maxReintentos);

            // Programar envío inicial (dentro de X horas)
            invitacion.setFechaProximoReintento(LocalDateTime.now().plusHours(horasEnvioInicial));

            invitacionRepository.save(invitacion);

            logger.info("Invitación a encuesta programada para turno: {} (envío en {} horas)",
                       turnoId, horasEnvioInicial);

        } catch (Exception e) {
            logger.error("Error al programar invitación de encuesta para turno: {}", turnoId, e);
        }
    }

    /**
     * Cancela invitaciones pendientes cuando un turno se cancela.
     */
    @Transactional
    public void cancelarInvitacionesPorTurno(Integer turnoId) {
        try {
            List<EncuestaInvitacion> invitaciones = invitacionRepository.findByTurno_IdOrderByFechaCreacionDesc(turnoId);

            for (EncuestaInvitacion invitacion : invitaciones) {
                if (invitacion.getEstado() == EstadoInvitacion.PENDIENTE) {
                    invitacion.marcarCancelada();
                    logger.info("Invitación cancelada para turno: {}", turnoId);
                }
            }

            invitacionRepository.saveAll(invitaciones);

        } catch (Exception e) {
            logger.error("Error al cancelar invitaciones para turno: {}", turnoId, e);
        }
    }

    /**
     * Marca una invitación como completada cuando el paciente responde la encuesta.
     */
    @Transactional
    public void marcarInvitacionCompletada(Integer turnoId, Integer pacienteId) {
        try {
            List<EncuestaInvitacion> invitaciones = invitacionRepository.findByTurno_IdOrderByFechaCreacionDesc(turnoId);

            for (EncuestaInvitacion invitacion : invitaciones) {
                if (invitacion.getPaciente().getId().equals(pacienteId) &&
                    invitacion.getEstado() != EstadoInvitacion.COMPLETADA) {
                    invitacion.marcarCompletada();
                    logger.info("Invitación marcada como completada para turno: {} y paciente: {}", turnoId, pacienteId);
                    break;
                }
            }

        } catch (Exception e) {
            logger.error("Error al marcar invitación como completada: {}", e.getMessage());
        }
    }

    /**
     * Tarea programada que se ejecuta cada hora para procesar invitaciones pendientes.
     */
    @Scheduled(fixedRate = 3600000) // Cada hora (3600000 ms)
    @Transactional
    public void procesarInvitacionesPendientes() {
        logger.info("Iniciando procesamiento de invitaciones pendientes de encuesta");

        try {
            LocalDateTime ahora = LocalDateTime.now();
            List<EncuestaInvitacion> invitacionesParaProcesar =
                invitacionRepository.findInvitacionesParaReintento(EstadoInvitacion.PENDIENTE, ahora);

            logger.info("Encontradas {} invitaciones para procesar", invitacionesParaProcesar.size());

            for (EncuestaInvitacion invitacion : invitacionesParaProcesar) {
                procesarInvitacion(invitacion);
            }

        } catch (Exception e) {
            logger.error("Error en procesamiento programado de invitaciones: {}", e.getMessage(), e);
        }
    }

    /**
     * Procesa TODAS las invitaciones pendientes forzando el envío (ignora timing programado).
     * Método para testing manual.
     */
    @Transactional
    public void procesarInvitacionesPendientesForzandoEnvio() {
        logger.info("Iniciando procesamiento FORZADO de invitaciones pendientes de encuesta (ignorando timing)");

        try {
            List<EncuestaInvitacion> invitacionesParaProcesar =
                invitacionRepository.findInvitacionesPendientesSinFiltroFecha(EstadoInvitacion.PENDIENTE);

            logger.info("Encontradas {} invitaciones pendientes para procesar (forzando envío)", invitacionesParaProcesar.size());

            for (EncuestaInvitacion invitacion : invitacionesParaProcesar) {
                procesarInvitacion(invitacion, true); // Forzar envío ignorando checks
            }

        } catch (Exception e) {
            logger.error("Error en procesamiento forzado de invitaciones: {}", e.getMessage(), e);
        }
    }

    /**
     * Procesa una invitación individual enviando el email.
     */
    private void procesarInvitacion(EncuestaInvitacion invitacion) {
        procesarInvitacion(invitacion, false);
    }

    /**
     * Procesa una invitación individual enviando el email.
     * @param forzarEnvio Si es true, ignora el check de timing y reintentos
     */
    private void procesarInvitacion(EncuestaInvitacion invitacion, boolean forzarEnvio) {
        try {
            // Verificar que aún puede reintentar (solo si no se fuerza el envío)
            if (!forzarEnvio && !invitacion.puedeReintentar()) {
                invitacion.marcarExpirada();
                invitacionRepository.save(invitacion);
                logger.warn("Invitación expirada por máximo reintentos. Turno: {}", invitacion.getTurno().getId());
                return;
            }

            // Verificar que el turno aún está completado
            Turno turno = invitacion.getTurno();
            if (turno.getEstado() != EstadoTurno.COMPLETO) {
                invitacion.marcarCancelada();
                invitacionRepository.save(invitacion);
                logger.warn("Invitación cancelada porque turno ya no está completado. Turno: {}", turno.getId());
                return;
            }

            // Verificar que existe plantilla de encuesta
            Optional<unpsjb.labprog.backend.model.EncuestaPlantilla> plantillaOpt =
                encuestaService.getPlantillaForTurno(turno.getId());
            if (plantillaOpt.isEmpty()) {
                logger.warn("No hay plantilla de encuesta configurada para turno: {}", turno.getId());
                // No marcamos como error, solo esperamos
                return;
            }

            // Enviar email
            boolean enviado = enviarEmailInvitacion(invitacion);

            if (enviado) {
                invitacion.marcarEnviada();
                logger.info("Email de invitación enviado exitosamente. Turno: {}, Intento: {}",
                           turno.getId(), invitacion.getIntentosEnvio());
            } else {
                invitacion.marcarError("Error al enviar email");
                logger.warn("Error al enviar email de invitación. Turno: {}, Intento: {}",
                           turno.getId(), invitacion.getIntentosEnvio());
            }

            invitacionRepository.save(invitacion);

        } catch (Exception e) {
            logger.error("Error procesando invitación para turno: {}", invitacion.getTurno().getId(), e);
            try {
                invitacion.marcarError("Error interno: " + e.getMessage());
                invitacionRepository.save(invitacion);
            } catch (Exception saveError) {
                logger.error("Error al guardar estado de error de invitación: {}", saveError.getMessage());
            }
        }
    }

    /**
     * Envía el email de invitación a la encuesta.
     */
    private boolean enviarEmailInvitacion(EncuestaInvitacion invitacion) {
        try {
            Turno turno = invitacion.getTurno();
            Paciente paciente = invitacion.getPaciente();

            String patientEmail = paciente.getEmail();
            String patientName = paciente.getNombre() + " " + paciente.getApellido();

            // Construir detalles del turno para el email
            String turnoDetails = construirDetallesTurnoParaEmail(turno);

            // Enviar email usando el servicio de email
            emailService.sendSurveyInvitationEmail(patientEmail, patientName, turnoDetails, turno.getId(), paciente.getId());

            return true;

        } catch (Exception e) {
            logger.error("Error enviando email de invitación: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Construye los detalles del turno formateados para el email de invitación.
     */
    private String construirDetallesTurnoParaEmail(Turno turno) {
        StringBuilder detalles = new StringBuilder();

        detalles.append("<p><strong>Fecha y Hora:</strong> ")
                .append(turno.getFecha().toString())
                .append(" ")
                .append(turno.getHoraInicio().toString())
                .append("</p>");

        if (turno.getStaffMedico() != null && turno.getStaffMedico().getEspecialidad() != null) {
            detalles.append("<p><strong>Especialidad:</strong> ")
                    .append(turno.getStaffMedico().getEspecialidad().getNombre())
                    .append("</p>");
        }

        if (turno.getStaffMedico() != null && turno.getStaffMedico().getMedico() != null) {
            detalles.append("<p><strong>Profesional:</strong> Dr/a. ")
                    .append(turno.getStaffMedico().getMedico().getNombre())
                    .append(" ")
                    .append(turno.getStaffMedico().getMedico().getApellido())
                    .append("</p>");
        }

        if (turno.getConsultorio() != null) {
            detalles.append("<p><strong>Consultorio:</strong> ")
                    .append(turno.getConsultorio().getNombre());

            if (turno.getConsultorio().getCentroAtencion() != null) {
                detalles.append(" - ")
                        .append(turno.getConsultorio().getCentroAtencion().getNombre());
            }
            detalles.append("</p>");
        }

        detalles.append("<p><strong>Número de Turno:</strong> #").append(turno.getId()).append("</p>");

        return detalles.toString();
    }

    /**
     * Tarea programada que limpia invitaciones expiradas antiguas (cada día).
     */
    @Scheduled(fixedRate = 86400000) // Cada 24 horas (86400000 ms)
    @Transactional
    public void limpiarInvitacionesExpiradas() {
        try {
            LocalDateTime fechaLimite = LocalDateTime.now().minusDays(limiteDiasLimpieza);
            List<EncuestaInvitacion> invitacionesExpiradas =
                invitacionRepository.findInvitacionesExpiradasParaLimpiar(fechaLimite);

            if (!invitacionesExpiradas.isEmpty()) {
                invitacionRepository.deleteAll(invitacionesExpiradas);
                logger.info("Limpieza completada: {} invitaciones expiradas eliminadas", invitacionesExpiradas.size());
            }

        } catch (Exception e) {
            logger.error("Error en limpieza de invitaciones expiradas: {}", e.getMessage());
        }
    }

    /**
     * Obtiene estadísticas de invitaciones enviadas.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> obtenerEstadisticas() {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();

        try {
            LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);

            long enviadas24h = invitacionRepository.countInvitacionesEnviadasDesde(last24Hours);
            long totalPendientes = invitacionRepository.findByEstado(EstadoInvitacion.PENDIENTE).size();
            long totalEnviadas = invitacionRepository.findByEstado(EstadoInvitacion.ENVIADA).size();
            long totalCompletadas = invitacionRepository.findByEstado(EstadoInvitacion.COMPLETADA).size();
            long totalExpiradas = invitacionRepository.findByEstado(EstadoInvitacion.EXPIRADA).size();

            stats.put("enviadasUltimas24h", enviadas24h);
            stats.put("totalPendientes", totalPendientes);
            stats.put("totalEnviadas", totalEnviadas);
            stats.put("totalCompletadas", totalCompletadas);
            stats.put("totalExpiradas", totalExpiradas);

        } catch (Exception e) {
            logger.error("Error obteniendo estadísticas de invitaciones: {}", e.getMessage());
        }

        return stats;
    }
}