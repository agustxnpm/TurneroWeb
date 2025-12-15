# language: es

@workflow @staff-medico @multi-tenant
Característica: Flujos de Trabajo y Conflictos de Staff Médico

  Como sistema de gestión de turnos multi-tenant
  Necesito validar que los médicos puedan trabajar en múltiples centros
  Y detectar conflictos de horarios entre centros

  Antecedentes:
    Dado que existen los datos de prueba cargados
    Y existe el médico "Dr. González" que puede trabajar en múltiples centros

  # =====================================================================
  # SECCIÓN 1: MÉDICO TRABAJANDO EN MÚLTIPLES CENTROS
  # =====================================================================

  @multi-centro @setup
  Escenario: Verificar que un médico puede estar asociado a múltiples centros
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Cuando consulto las asociaciones del médico "Dr. González"
    Entonces el médico puede tener asociaciones con diferentes centros
    Y cada asociación tiene configuración independiente

  @multi-centro @admin-view
  Escenario: Admin de Centro 1 solo ve su asociación con el médico compartido
    Dado que el médico "Dr. González" está asociado al centro 1 y centro 2
    Y me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto el staff médico de mi centro
    Entonces veo al Dr. González en la lista
    Y solo veo sus especialidades y horarios del centro 1
    Y NO veo su configuración del centro 2

  @multi-centro @admin-view
  Escenario: Admin de Centro 2 solo ve su asociación con el médico compartido
    Dado que el médico "Dr. González" está asociado al centro 1 y centro 2
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando consulto el staff médico de mi centro
    Entonces veo al Dr. González en la lista
    Y solo veo sus especialidades y horarios del centro 2
    Y NO veo su configuración del centro 1

  # =====================================================================
  # SECCIÓN 2: CONFLICTOS DE HORARIOS ENTRE CENTROS
  # =====================================================================

  @horarios @conflict
  Escenario: Detectar solapamiento de horarios del mismo médico entre centros
    Dado que el médico "Dr. González" tiene horario en centro 1:
      | dia    | horaInicio | horaFin |
      | LUNES  | 08:00      | 12:00   |
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando intento agregar al médico con horario en centro 2:
      | dia    | horaInicio | horaFin |
      | LUNES  | 10:00      | 14:00   |
    Entonces el sistema detecta el conflicto de horarios
    Y recibo un mensaje indicando solapamiento
    Y el horario NO se crea

  @horarios @no-conflict
  Escenario: Permitir horarios no solapados del mismo médico entre centros
    Dado que el médico "Dr. González" tiene horario en centro 1:
      | dia    | horaInicio | horaFin |
      | LUNES  | 08:00      | 12:00   |
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando agrego al médico con horario en centro 2:
      | dia    | horaInicio | horaFin |
      | LUNES  | 14:00      | 18:00   |
    Entonces el horario se crea exitosamente
    Y el médico tiene horarios en ambos centros sin conflicto

  @horarios @no-conflict @different-day
  Escenario: Permitir horarios en diferentes días entre centros
    Dado que el médico "Dr. González" tiene horario en centro 1:
      | dia    | horaInicio | horaFin |
      | LUNES  | 08:00      | 18:00   |
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando agrego al médico con horario en centro 2:
      | dia    | horaInicio | horaFin |
      | MARTES | 08:00      | 18:00   |
    Entonces el horario se crea exitosamente
    Y NO hay conflicto de horarios

  @horarios @boundary
  Escenario: Horarios que terminan y empiezan en el mismo momento NO son conflicto
    Dado que el médico "Dr. González" tiene horario en centro 1:
      | dia    | horaInicio | horaFin |
      | LUNES  | 08:00      | 12:00   |
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando agrego al médico con horario en centro 2:
      | dia    | horaInicio | horaFin |
      | LUNES  | 12:00      | 16:00   |
    Entonces el horario se crea exitosamente
    Y el médico puede atender en centro 2 justo cuando termina en centro 1

  @horarios @overlap-total
  Escenario: Detectar conflicto cuando un horario contiene completamente a otro
    Dado que el médico "Dr. González" tiene horario en centro 1:
      | dia    | horaInicio | horaFin |
      | LUNES  | 09:00      | 11:00   |
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando intento agregar al médico con horario en centro 2:
      | dia    | horaInicio | horaFin |
      | LUNES  | 08:00      | 12:00   |
    Entonces el sistema detecta el conflicto de horarios
    Y el nuevo horario NO se crea

  # =====================================================================
  # SECCIÓN 3: GESTIÓN DE DISPONIBILIDAD MÉDICO
  # =====================================================================

  @disponibilidad @view
  Escenario: Consultar disponibilidad de médico muestra todos sus compromisos
    Dado que el médico "Dr. González" trabaja en centros 1 y 2
    Y tiene horarios definidos en ambos centros
    Cuando un operador consulta la disponibilidad del médico para agendar turno
    Entonces ve los bloques ocupados de todos los centros
    Y puede seleccionar solo horarios libres

  @disponibilidad @turno
  Escenario: No se puede agendar turno en horario ya ocupado en otro centro
    Dado que el médico "Dr. González" tiene turno asignado en centro 1:
      | fecha      | hora  |
      | 15-01-2025 | 10:00 |
    Y me autentico como "operador1.delsur@turnero.com" con password "password"
    Cuando intento crear un turno con ese médico en centro 2:
      | fecha      | hora  |
      | 15-01-2025 | 10:00 |
    Entonces el sistema rechaza el turno por conflicto
    Y el mensaje indica que el médico no está disponible

  # =====================================================================
  # SECCIÓN 4: ESQUEMAS DE TURNO CON MÉDICO COMPARTIDO
  # =====================================================================

  @esquema-turno @create
  Escenario: Crear esquema de turno para médico en mi centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Y el médico "Dr. González" está asociado a mi centro
    Cuando creo un esquema de turno para el médico con:
      | consultorioId    | <id_consultorio_centro1> |
      | horaInicio       | 08:00                    |
      | horaFin          | 12:00                    |
      | duracionTurno    | 30                       |
      | diasSemana       | LUNES,MARTES,MIERCOLES   |
    Entonces el esquema se crea exitosamente
    Y queda asociado a mi centro

  @esquema-turno @validate
  Escenario: Validar que esquema de turno no conflictúe con otros centros
    Dado que el médico tiene esquema de turno en centro 1:
      | dia   | horaInicio | horaFin |
      | LUNES | 08:00      | 12:00   |
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando intento crear esquema de turno para el médico en centro 2:
      | dia   | horaInicio | horaFin |
      | LUNES | 10:00      | 14:00   |
    Entonces recibo advertencia de solapamiento con otro centro
    Y puedo decidir si continuar o no

  # =====================================================================
  # SECCIÓN 5: FLUJOS COMPLETOS DE TRABAJO
  # =====================================================================

  @workflow @complete
  Escenario: Flujo completo - Operador agenda turno con médico compartido
    Dado que el médico "Dr. González" está disponible en centro 1 hoy de 10:00 a 12:00
    Y me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando busco disponibilidad del médico para hoy
    Y selecciono el horario de 10:30
    Y asigno el turno al paciente "Juan Pérez"
    Entonces el turno se crea exitosamente
    Y el paciente recibe confirmación
    Y el horario de 10:30 ya no está disponible

  @workflow @cancel
  Escenario: Flujo completo - Cancelar turno libera disponibilidad
    Dado que existe un turno asignado al médico "Dr. González" en centro 1
    Y me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando cancelo el turno con motivo "Solicitud del paciente"
    Entonces el turno cambia a estado CANCELADO
    Y el horario vuelve a estar disponible para otros pacientes

  @workflow @reschedule
  Escenario: Flujo completo - Reagendar turno respeta disponibilidad
    Dado que existe un turno del paciente "Juan Pérez" con el Dr. González en centro 1
    Y me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento reagendar el turno a un horario disponible
    Entonces el turno se reagenda exitosamente
    Y el horario anterior queda libre
    Y el nuevo horario queda ocupado

  @workflow @reschedule @conflict
  Escenario: No se puede reagendar a horario ocupado en otro centro
    Dado que existe un turno del paciente en centro 1
    Y el médico tiene turno en centro 2 a las 15:00
    Y me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento reagendar el turno a las 15:00
    Entonces el sistema rechaza por conflicto con el centro 2
    Y el turno mantiene su horario original

  # =====================================================================
  # SECCIÓN 6: REPORTES Y AUDITORÍA
  # =====================================================================

  @audit @turno
  Escenario: Cambios de estado de turno quedan auditados
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un turno programado
    Cuando confirmo la asistencia del paciente
    Y luego marco el turno como completado
    Entonces el historial de auditoría muestra:
      | accion     | usuario                    |
      | CREACION   | operador1.santamaria@turnero.com   |
      | CONFIRMADO | operador1.santamaria@turnero.com   |
      | COMPLETADO | operador1.santamaria@turnero.com   |

  @audit @cross-center-attempt
  Escenario: Intentos de acceso cross-center quedan registrados (si aplica)
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento acceder a un turno del centro 2
    Entonces el acceso es denegado
    # Y el intento queda registrado en logs de seguridad

  # =====================================================================
  # SECCIÓN 7: PORCENTAJES DE MÉDICOS POR CENTRO
  # =====================================================================

  @porcentajes @view
  Escenario: Admin puede ver porcentajes de médicos en su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto los porcentajes de médicos del centro 1
    Entonces recibo status_code 200
    Y veo el total de porcentajes asignados

  @porcentajes @update
  Escenario: Admin puede actualizar porcentajes de médicos en su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Y tengo médicos asociados a mi centro
    Cuando actualizo los porcentajes de distribución
    Entonces los porcentajes se actualizan exitosamente
    Y la suma no excede 100%

  @porcentajes @cross-center @forbidden
  Escenario: Admin NO puede ver porcentajes de médicos de otro centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto los porcentajes de médicos del centro 2
    Entonces recibo status_code 403 o lista vacía
    Y NO veo información del centro 2
