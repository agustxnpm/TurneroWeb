package unpsjb.labprog.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO específico para la vista de historial de turnos
 * Incluye información adicional de auditoría y observaciones
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistorialTurnoDTO {

    // Información básica del turno
    private Integer id;
    private LocalDate fecha;
    private LocalTime horaInicio;
    private LocalTime horaFin;
    private String estado;

    // Información del paciente
    private Integer pacienteId;
    private String nombrePaciente;
    private String apellidoPaciente;
    private Long dniPaciente;
    private String emailPaciente;
    private String telefonoPaciente;

    // Información del médico
    private Integer staffMedicoId;
    private String staffMedicoNombre;
    private String staffMedicoApellido;
    private String especialidadStaffMedico;

    // Información del consultorio y centro
    private Integer consultorioId;
    private String consultorioNombre;
    private Integer centroId;
    private String nombreCentro;
    private String direccionCentro;

    // Observaciones del turno
    private String observaciones;
    private Boolean asistio; // null = pendiente/presente por defecto, true = asistió, false = no asistió
    // private LocalDateTime fechaRegistroAsistencia;

    // Información de auditoría
    private String creadoPor;
    private LocalDateTime fechaCreacion;
    private String ultimoUsuarioModificacion;
    private LocalDateTime fechaUltimaModificacion;
    private String motivoUltimaModificacion;
    private Integer totalModificaciones;

    // Estados históricos (para timeline)
    private String estadoAnterior;
    private LocalDateTime fechaCambioEstado;
    private String usuarioCambioEstado;

    // Información adicional para cancelaciones
    private String motivoCancelacion;
    private LocalDateTime fechaCancelacion;
    private String usuarioCancelacion;

    // Información adicional para reagendamientos
    private LocalDate fechaOriginal;
    private LocalTime horaOriginal;
    private String motivoReagendamiento;

    // Métodos de conveniencia

    public String getNombreCompletoMedico() {
        if (staffMedicoNombre != null && staffMedicoApellido != null) {
            return "Dr/a. " + staffMedicoNombre + " " + staffMedicoApellido;
        }
        return "Médico no disponible";
    }

    public String getNombreCompletoPaciente() {
        if (nombrePaciente != null && apellidoPaciente != null) {
            return nombrePaciente + " " + apellidoPaciente;
        }
        return "Paciente no disponible";
    }

    public String getFechaHoraFormateada() {
        if (fecha != null && horaInicio != null) {
            return fecha.toString() + " " + horaInicio.toString();
        }
        return "Fecha no disponible";
    }

    public boolean tieneObservaciones() {
        return observaciones != null && !observaciones.trim().isEmpty();
    }

    public boolean fueCancelado() {
        return "CANCELADO".equals(estado);
    }

    public boolean fueReagendado() {
        return "REAGENDADO".equals(estado);
    }

    public boolean tieneHistorialModificaciones() {
        return totalModificaciones != null && totalModificaciones > 0;
    }

    /**
     * Obtiene un resumen del turno para mostrar en listados
     */
    public String getResumen() {
        StringBuilder resumen = new StringBuilder();
        resumen.append(getFechaHoraFormateada())
                .append(" - ")
                .append(getNombreCompletoMedico())
                .append(" (")
                .append(especialidadStaffMedico != null ? especialidadStaffMedico : "Sin especialidad")
                .append(")");

        if (tieneObservaciones()) {
            resumen.append(" - Obs: ")
                    .append(observaciones.length() > 50 ? observaciones.substring(0, 47) + "..." : observaciones);
        }

        return resumen.toString();
    }

    /**
     * Obtiene información sobre cambios realizados al turno
     */
    public String getInformacionCambios() {
        if (!tieneHistorialModificaciones()) {
            return "Sin modificaciones";
        }

        StringBuilder info = new StringBuilder();
        info.append("Total de modificaciones: ").append(totalModificaciones);

        if (ultimoUsuarioModificacion != null) {
            info.append(". Última modificación por: ")
                    .append(ultimoUsuarioModificacion);

            if (fechaUltimaModificacion != null) {
                info.append(" el ").append(fechaUltimaModificacion);
            }
        }

        return info.toString();
    }
}