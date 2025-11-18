/**
 * Interface para encuesta respondida con información completa
 * Incluye datos del turno, paciente, médico, centro y todas las respuestas
 */
export interface EncuestaDetalle {
  // Información del turno
  turnoId: number;
  fechaTurno: string; // LocalDate en formato dd-MM-yyyy

  // Información del paciente
  pacienteId: number;
  pacienteNombre: string;

  // Información del médico
  medicoId: number;
  medicoNombre: string;

  // Información del centro de atención
  centroAtencionId: number;
  centroAtencionNombre: string;

  // Información de especialidad
  especialidadNombre?: string;

  // Fecha de respuesta de la encuesta
  fechaRespuesta: string; // LocalDateTime en formato ISO

  // Respuestas agrupadas por tipo de pregunta
  // Key: nombre o tipo de pregunta (NPS, CSAT, RATING, etc.)
  // Value: valor de la respuesta (numérico o texto)
  respuestas: { [key: string]: any };

  // Comentario (si existe)
  comentario?: string;
}
