package unpsjb.labprog.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para mostrar información completa de una encuesta respondida
 * Incluye datos del turno, paciente, médico, centro de atención y todas las respuestas
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EncuestaDetalleDTO {
    
    // Información del turno
    private Integer turnoId;
    private LocalDate fechaTurno;
    
    // Información del paciente
    private Integer pacienteId;
    private String pacienteNombre;
    
    // Información del médico
    private Integer medicoId;
    private String medicoNombre;
    
    // Información del centro de atención
    private Integer centroAtencionId;
    private String centroAtencionNombre;
    
    // Información de especialidad
    private String especialidadNombre;
    
    // Fecha de respuesta de la encuesta
    private LocalDateTime fechaRespuesta;
    
    // Respuestas agrupadas por tipo de pregunta
    // Key: nombre o tipo de pregunta (NPS, CSAT, etc.)
    // Value: valor de la respuesta (numérico o texto)
    private Map<String, Object> respuestas;
    
    // Comentario (si existe)
    private String comentario;
}
