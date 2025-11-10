/**
 * Interfaz que representa una preferencia horaria de un paciente.
 * 
 * Las preferencias horarias permiten al paciente indicar los días y horarios
 * de su preferencia para la asignación de turnos médicos.
 * 
 * Esta interfaz debe mantener consistencia con el modelo backend:
 * - Java Entity: unpsjb.labprog.backend.model.PreferenciaHoraria
 * - DTO (si existe): unpsjb.labprog.backend.dto.PreferenciaHorariaDTO
 */
export interface PreferenciaHoraria {
  /**
   * Identificador único de la preferencia horaria.
   * Opcional porque no existe antes de guardar la preferencia en la base de datos.
   * @type {number}
   * @optional
   */
  id?: number;

  /**
   * Día de la semana para la preferencia.
   * Debe ser uno de los valores del enum DiaDeLaSemana del backend:
   * 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'
   * @type {string}
   * @required
   */
  diaDeLaSemana: string;

  /**
   * Hora de inicio del rango horario preferido.
   * Formato: 'HH:mm' (24 horas, ej: '09:00', '14:30')
   * @type {string}
   * @required
   */
  horaDesde: string;

  /**
   * Hora de fin del rango horario preferido.
   * Formato: 'HH:mm' (24 horas, ej: '12:00', '18:00')
   * Debe ser posterior a horaDesde.
   * @type {string}
   * @required
   */
  horaHasta: string;
}
