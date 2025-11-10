package unpsjb.labprog.backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO público para exponer turnos disponibles sin información sensible.
 * Este DTO NO contiene datos del paciente para proteger su privacidad.
 * Solo expone información básica necesaria para que usuarios anónimos
 * puedan consultar la disponibilidad de turnos.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TurnoPublicoDTO {
    
    /**
     * ID del turno
     */
    private Integer id;
    
    /**
     * Fecha del turno
     */
    private LocalDate fecha;
    
    /**
     * Hora de inicio del turno
     */
    private LocalTime horaInicio;
    
    /**
     * Hora de fin del turno
     */
    private LocalTime horaFin;
    
    /**
     * Indica si es un slot generado (true) o un turno reservado (false)
     */
    private Boolean esSlot;
    
    /**
     * ID del staff médico
     */
    private Integer staffMedicoId;
    
    /**
     * Nombre del médico
     */
    private String staffMedicoNombre;
    
    /**
     * Apellido del médico
     */
    private String staffMedicoApellido;
    
    /**
     * Especialidad médica del staff
     */
    private String especialidadStaffMedico;
    
    /**
     * ID del consultorio
     */
    private Integer consultorioId;
    
    /**
     * Nombre del consultorio
     */
    private String consultorioNombre;
    
    /**
     * ID del centro de atención
     */
    private Integer centroId;
    
    /**
     * Nombre del centro de atención
     */
    private String nombreCentro;
    
    /**
     * Indica si el slot está ocupado
     */
    private Boolean ocupado;
}
