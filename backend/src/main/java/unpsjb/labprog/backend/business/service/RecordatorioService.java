package unpsjb.labprog.backend.business.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import unpsjb.labprog.backend.business.repository.TurnoRepository;
import unpsjb.labprog.backend.model.EstadoTurno;
import unpsjb.labprog.backend.model.Turno;

@Service
public class RecordatorioService {

    @Autowired
    private ConfiguracionService configuracionService;
    @Autowired
    private TurnoRepository turnoRepository;

    @Autowired
    private EmailService emailService;

    // === MÉTODOS PRINCIPALES ===

    /**
     * Tarea programada para enviar recordatorios de confirmación de turnos.
     * Se ejecuta diariamente a las 9:00 AM (configurable).
     * Busca turnos programados o reagendados en un rango de fechas futuras.
     */
    @Scheduled(cron = "0 0 9 * * ?", zone = "America/Argentina/Buenos_Aires") // Diariamente a las 9:00 AM
    @Transactional
    public void enviarRecordatoriosPendientes() {
        if (!configuracionService.isHabilitadosRecordatorios()) {
            System.out.println("📧 Recordatorios de confirmación deshabilitados por configuración");
            return;
        }

        LocalDate hoy = LocalDate.now();
        int diasRecordatorio = configuracionService.getDiasRecordatorioConfirmacion();

        // Calcular rango: desde mañana hasta diasRecordatorio días en el futuro
        LocalDate fechaDesde = hoy.plusDays(1);
        LocalDate fechaHasta = hoy.plusDays(diasRecordatorio);

        System.out.println(String.format(
            "📧 Enviando recordatorios para turnos entre: %s y %s (%d días de anticipación)",
            fechaDesde, fechaHasta, diasRecordatorio
        ));

        // Buscar turnos en el rango de fechas
        List<Turno> turnosPorFecha = turnoRepository.findByFechaBetween(fechaDesde, fechaHasta);

        // Filtrar solo turnos PROGRAMADOS y REAGENDADOS
        List<Turno> turnosParaRecordar = turnosPorFecha.stream()
                .filter(t -> t.getEstado() == EstadoTurno.PROGRAMADO || 
                            t.getEstado() == EstadoTurno.REAGENDADO)
                .collect(Collectors.toList());

        System.out.println("📧 Turnos encontrados para recordatorio: " + turnosParaRecordar.size());

        for (Turno turno : turnosParaRecordar) {
            try {
                enviarRecordatorio(turno, "RECORDATORIO");
                System.out.println("✅ Recordatorio enviado para turno ID: " + turno.getId());
            } catch (Exception e) {
                System.err.println("❌ Error al enviar recordatorio para turno ID " + 
                    turno.getId() + ": " + e.getMessage());
            }
        }

        System.out.println("📧 Proceso de recordatorios completado");
    }

    private boolean enviarRecordatorio(Turno turno, String tipo) {
        try {
            String email = turno.getPaciente().getEmail();
            String patientName = turno.getPaciente().getNombre() + " " + turno.getPaciente().getApellido();
            String reminderDetails = construirDetallesRecordatorio(turno);
            Integer pacienteId = turno.getPaciente().getId();
            Integer turnoId = turno.getId();

            // Enviar email con deep-link para confirmación automática
            emailService.sendAppointmentReminderEmail(email, patientName, reminderDetails, pacienteId, turnoId);
            
            System.out.println("✅ Email de recordatorio con deep-link enviado a: " + email + " para turno ID: " + turnoId);
            return true;
        } catch (Exception e) {
            System.err.println("❌ Error al enviar recordatorio para turno " + turno.getId() + ": " + e.getMessage());
            return false;
        }
    }

    // === MÉTODOS DE CONSULTA ===

    // === MÉTODOS DE GESTIÓN DE ESTADO ===

    // === ESTADÍSTICAS ===

    // === REINTENTO DE RECORDATORIOS FALLIDOS ===

    /**
     * Construye los detalles HTML del recordatorio de turno para el email
     */
    private String construirDetallesRecordatorio(Turno turno) {
        StringBuilder detalles = new StringBuilder();

        detalles.append("<h3>Recordatorio de Confirmación de Turno</h3>");
        
        // Formatear fecha de forma legible
        String fechaFormateada = turno.getFecha().format(
            java.time.format.DateTimeFormatter.ofPattern("EEEE d 'de' MMMM 'de' yyyy", 
            java.util.Locale.forLanguageTag("es-AR"))
        );
        
        detalles.append("<p><strong>Fecha y Hora:</strong> ")
                .append(fechaFormateada)
                .append(" a las ")
                .append(turno.getHoraInicio())
                .append("</p>");
        
        detalles.append("<p><strong>Especialidad:</strong> ")
                .append(turno.getStaffMedico() != null && turno.getStaffMedico().getEspecialidad() != null
                        ? turno.getStaffMedico().getEspecialidad().getNombre()
                        : "No disponible")
                .append("</p>");
        
        detalles.append("<p><strong>Médico:</strong> Dr/a. ")
                .append(turno.getStaffMedico() != null && turno.getStaffMedico().getMedico() != null
                        ? turno.getStaffMedico().getMedico().getNombre() + " "
                                + turno.getStaffMedico().getMedico().getApellido()
                        : "No disponible")
                .append("</p>");

        if (turno.getConsultorio() != null) {
            detalles.append("<p><strong>Consultorio:</strong> ")
                    .append(turno.getConsultorio().getNombre());
            if (turno.getConsultorio().getCentroAtencion() != null) {
                detalles.append(" - ").append(turno.getConsultorio().getCentroAtencion().getNombre());
            }
            detalles.append("</p>");
        }

        detalles.append("<p><strong>Número de Turno:</strong> #").append(turno.getId()).append("</p>");

        // Información sobre límites de confirmación
        int diasMin = configuracionService.getDiasMinConfirmacion();
        LocalTime horaCorte = configuracionService.getHoraCorteConfirmacion();
        LocalDate fechaLimite = LocalDate.now().plusDays(diasMin);

        detalles.append("<hr>");
        detalles.append(
                "<p><strong style='color: #d32f2f;'>IMPORTANTE:</strong> Debe confirmar este turno antes del <strong>");
        detalles.append(fechaLimite).append(" a las ").append(horaCorte).append("</strong></p>");
        detalles.append("<p>Si no confirma a tiempo, el turno será cancelado automáticamente.</p>");

        // Instrucciones de confirmación
        detalles.append("<hr>");
        detalles.append("<p><strong>¿Cómo confirmar?</strong></p>");
        detalles.append("<ul>");
        detalles.append("<li>Haga clic en el botón \"Confirmar turno\" en este email</li>");
        detalles.append("<li>Ingrese a su cuenta en el portal del paciente</li>");
        detalles.append("<li>Llame al teléfono de la clínica</li>");
        detalles.append("<li>Acérquese personalmente a recepción</li>");
        detalles.append("</ul>");

        return detalles.toString();
    }

}
