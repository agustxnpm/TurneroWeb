# language: es

@rol @operador @multi-tenant
Característica: Permisos y Acceso del OPERADOR (Tenant-Bound)

  Como OPERADOR de un centro de atención
  Solo tengo acceso a los recursos de mi centro asignado
  Y puedo gestionar turnos y pacientes dentro de mi centro

  # =====================================================================
  # SECCIÓN 1: OPERADORES DEL CENTRO 1 - CLÍNICA SANTA MARÍA
  # =====================================================================

  @centro1
  Escenario: Setup Operador 1 del Centro 1
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Entonces verifico que mi rol es OPERADOR
    Y mi centroAtencionId es 1
    Y mi centro es "Clínica Santa María"

  # ----- TURNOS -----

  @centro1 @turnos @read
  Escenario: OPERADOR Centro 1 solo ve turnos de su centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto los turnos
    Entonces recibo status_code 200
    Y solo veo turnos de consultorios del centro 1
    Y NO veo turnos de otros centros

  @centro1 @turnos @create
  Escenario: OPERADOR Centro 1 puede crear turnos en su centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un consultorio activo en el centro 1
    Y existe un paciente "aguspalqui@hotmail.com"
    Cuando creo un turno con:
      | campo          | valor                     |
      | pacienteId     | <id_paciente>             |
      | consultorioId  | <id_consultorio_centro1>  |
      | fecha          | <fecha_futura>            |
      | hora           | 10:00                     |
    Entonces el turno se crea exitosamente
    Y el turno queda asociado al centro 1

  @centro1 @turnos @create @forbidden
  Escenario: OPERADOR Centro 1 NO puede crear turnos en otro centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y conozco el ID de un consultorio del centro 2
    Cuando intento crear un turno en ese consultorio
    Entonces recibo status_code 403 o error de validación
    Y el turno NO se crea

  @centro1 @turnos @update
  Escenario: OPERADOR Centro 1 puede modificar turnos de su centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un turno en el centro 1
    Cuando modifico la hora del turno a "11:00"
    Entonces la modificación es exitosa
    Y el turno tiene la nueva hora

  @centro1 @turnos @cancel
  Escenario: OPERADOR Centro 1 puede cancelar turnos de su centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un turno programado en el centro 1
    Cuando cancelo el turno con motivo "Paciente no disponible"
    Entonces el turno se cancela exitosamente
    Y el estado es CANCELADO
    Y se registra quién canceló el turno

  @centro1 @turnos @cancel @forbidden
  Escenario: OPERADOR Centro 1 NO puede cancelar turnos de otro centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y conozco el ID de un turno del centro 2
    Cuando intento cancelar ese turno
    Entonces recibo status_code 403 o 404
    Y el turno NO cambia de estado

  # ----- CONSULTORIOS -----

  @centro1 @consultorios @read
  Escenario: OPERADOR Centro 1 solo ve consultorios de su centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto los consultorios
    Entonces recibo status_code 200
    Y solo veo consultorios del centro 1
    Y NO veo consultorios de otros centros

  @centro1 @consultorios @create @forbidden
  Escenario: OPERADOR NO puede crear consultorios (solo ADMIN)
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento crear un consultorio
    Entonces recibo status_code 403
    Y el consultorio NO se crea

  # ----- PACIENTES -----

  @centro1 @pacientes @read
  Escenario: OPERADOR Centro 1 puede ver pacientes
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto los pacientes
    Entonces recibo status_code 200
    Y veo la lista de pacientes

  @centro1 @pacientes @search
  Escenario: OPERADOR puede buscar pacientes por DNI
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando busco un paciente por DNI "30111222"
    Entonces encuentro al paciente "Juan Pérez"

  @centro1 @pacientes @create
  Escenario: OPERADOR puede registrar nuevos pacientes
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando registro un nuevo paciente con:
      | campo    | valor                     |
      | nombre   | Paciente                  |
      | apellido | Nuevo                     |
      | dni      | 55555555                  |
      | email    | paciente.nuevo@email.com  |
    Entonces el paciente se registra exitosamente

  # ----- MÉDICOS -----

  @centro1 @medicos @read
  Escenario: OPERADOR Centro 1 solo ve médicos asociados a su centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto los médicos disponibles en mi centro
    Entonces recibo status_code 200
    Y solo veo médicos con staff-medico en el centro 1

  @centro1 @medicos @create @forbidden
  Escenario: OPERADOR NO puede crear médicos directamente (flujo restringido)
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento crear un médico via POST /medicos
    Entonces recibo status_code 403
    Y el médico queda asociado a mi centro automáticamente

  # ----- STAFF MÉDICO -----

  @centro1 @staff @read
  Escenario: OPERADOR Centro 1 solo ve staff médico de su centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto el staff médico del centro 1
    Entonces recibo status_code 200
    Y veo las asociaciones de mi centro
    Y NO veo asociaciones de otros centros

  # ----- OPERADORES -----

  @centro1 @operadores @read @forbidden
  Escenario: OPERADOR NO puede ver lista de otros operadores
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto la lista de operadores
    Entonces recibo status_code 403
    Y solo veo mi propia información

  @centro1 @operadores @create @forbidden
  Escenario: OPERADOR NO puede crear otros operadores (solo ADMIN)
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento crear un operador
    Entonces recibo status_code 403
    Y el operador NO se crea

  # =====================================================================
  # SECCIÓN 2: OPERADORES DEL CENTRO 2 - CLÍNICA DEL SUR
  # =====================================================================

  @centro2
  Escenario: Setup Operador 1 del Centro 2
    Dado que me autentico como "operador1.delsur@turnero.com" con password "password"
    Entonces verifico que mi rol es OPERADOR
    Y mi centroAtencionId es 2
    Y mi centro es "Clínica del Sur"

  @centro2 @turnos @read
  Escenario: OPERADOR Centro 2 solo ve turnos de su centro
    Dado que me autentico como "operador1.delsur@turnero.com" con password "password"
    Cuando consulto los turnos
    Entonces recibo status_code 200
    Y solo veo turnos del centro 2
    Y NO veo turnos del centro 1
    Y NO veo turnos del centro 3

  @centro2 @consultorios @read
  Escenario: OPERADOR Centro 2 solo ve consultorios de su centro
    Dado que me autentico como "operador1.delsur@turnero.com" con password "password"
    Cuando consulto los consultorios
    Entonces recibo status_code 200
    Y solo veo consultorios del centro 2
    Y veo "Consultorio Sur 1", "Consultorio Sur 2", "Consultorio Sur 3", "Consultorio Sur 4"

  # =====================================================================
  # SECCIÓN 3: OPERADORES DEL CENTRO 3 - CONSULTORIOS DEL SOL
  # =====================================================================

  @centro3
  Escenario: Setup Operador 1 del Centro 3
    Dado que me autentico como "operador1.delsol@turnero.com" con password "password"
    Entonces verifico que mi rol es OPERADOR
    Y mi centroAtencionId es 3
    Y mi centro es "Consultorios del Sol"

  @centro3 @turnos @read
  Escenario: OPERADOR Centro 3 solo ve turnos de su centro
    Dado que me autentico como "operador1.delsol@turnero.com" con password "password"
    Cuando consulto los turnos
    Entonces recibo status_code 200
    Y solo veo turnos del centro 3
    Y NO veo turnos de centros 1 y 2

  # =====================================================================
  # SECCIÓN 4: VERIFICACIÓN CROSS-TENANT
  # =====================================================================

  @cross-tenant @forbidden
  Escenario: OPERADOR de un centro NO puede ver turnos de otro centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un turno en el centro 2 con ID conocido
    Cuando consulto ese turno específico
    Entonces recibo status_code 403 o 404
    Y NO veo los datos del turno

  @cross-tenant @forbidden
  Escenario: OPERADOR de un centro NO puede modificar turnos de otro centro
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y conozco el ID de un turno del centro 2
    Cuando intento modificar ese turno
    Entonces recibo status_code 403 o 404
    Y el turno NO es modificado

  @cross-tenant @isolation
  Esquema del escenario: Operadores de diferentes centros ven datos aislados
    Dado que me autentico como "<email>" con password "password"
    Cuando consulto los consultorios de mi centro
    Entonces solo veo consultorios del centro <centro_id>
    Y NO veo consultorios de otros centros

    Ejemplos:
      | email                       | centro_id |
      | operador1.santamaria@turnero.com    | 1         |
      | operador2.santamaria@turnero.com    | 1         |
      | operador1.delsur@turnero.com   | 2         |
      | operador2.delsur@turnero.com   | 2         |
      | operador1.delsol@turnero.com   | 3         |
      | operador2.delsol@turnero.com   | 3         |

  # =====================================================================
  # SECCIÓN 5: FLUJOS DE TRABAJO DE OPERADOR
  # =====================================================================

  @workflow @turno-completo
  Escenario: OPERADOR puede completar flujo de asignación de turno
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un paciente registrado
    Y existe un médico con disponibilidad en el centro 1
    Y existe un consultorio disponible en el centro 1
    Cuando busco al paciente por DNI
    Y selecciono el médico disponible
    Y selecciono un horario disponible
    Y confirmo la creación del turno
    Entonces el turno se crea con estado PROGRAMADO
    Y el turno queda registrado en el centro 1

  @workflow @turno-cancelacion
  Escenario: OPERADOR puede cancelar turno con auditoría
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un turno programado en el centro 1
    Cuando cancelo el turno con motivo "Solicitud del paciente"
    Entonces el turno cambia a estado CANCELADO
    Y se registra la auditoría con mi email
    Y se registra la fecha y hora de cancelación

  @workflow @turno-confirmacion
  Escenario: OPERADOR puede confirmar asistencia de paciente
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un turno programado para hoy en el centro 1
    Cuando confirmo la asistencia del paciente
    Entonces el turno cambia a estado CONFIRMADO
    Y se registra la auditoría

  # =====================================================================
  # SECCIÓN 6: RESTRICCIONES DE PERMISOS
  # =====================================================================

  @permisos @forbidden
  Escenario: OPERADOR NO puede acceder a endpoint de administradores
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto GET /admins
    Entonces recibo status_code 403

  @permisos @forbidden
  Escenario: OPERADOR NO puede crear administradores
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento POST /admins
    Entonces recibo status_code 403

  @permisos @forbidden
  Escenario: OPERADOR NO puede modificar datos del centro de atención
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento modificar el centro de atención 1
    Entonces recibo status_code 403
    Y el centro NO es modificado

  @permisos @forbidden
  Escenario: OPERADOR NO puede eliminar consultorios
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y existe un consultorio en el centro 1
    Cuando intento eliminar ese consultorio
    Entonces recibo status_code 403
    Y el consultorio sigue existiendo
