# language: es

@rol @superadmin @multi-tenant
Característica: Permisos y Acceso del SUPERADMIN

  Como SUPERADMIN del sistema
  Tengo acceso global a todos los centros de atención
  Y puedo gestionar administradores y recursos de cualquier centro

  Antecedentes:
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Y verifico que mi rol es SUPERADMIN
    Y mi centroAtencionId es null

  # =====================================================================
  # ACCESO GLOBAL A CENTROS DE ATENCIÓN
  # =====================================================================

  @centros @read
  Escenario: SUPERADMIN puede ver todos los centros de atención
    Cuando consulto los centros de atención
    Entonces recibo status_code 200
    Y puedo ver los 3 centros de atención del sistema
    Y cada centro tiene sus datos completos

  @centros @create
  Escenario: SUPERADMIN puede crear nuevos centros de atención
    Cuando creo un centro de atención con:
      | campo      | valor                    |
      | nombre     | Centro Test SUPERADMIN   |
      | direccion  | Av. Test 123             |
      | localidad  | Test City                |
      | provincia  | Chubut                   |
      | telefono   | 1234567890               |
      | latitud    | -42.7692                 |
      | longitud   | -65.0385                 |
    Entonces el centro se crea exitosamente
    Y puedo ver el nuevo centro en la lista

  @centros @update
  Escenario: SUPERADMIN puede editar cualquier centro de atención
    Dado que existe el centro "Clínica Santa María" con id 1
    Cuando actualizo el teléfono del centro a "9999999999"
    Entonces la actualización es exitosa
    Y el centro tiene el nuevo teléfono

  # =====================================================================
  # GESTIÓN DE ADMINISTRADORES (EXCLUSIVO SUPERADMIN)
  # =====================================================================

  @admins @read
  Escenario: SUPERADMIN puede ver todos los administradores
    Cuando consulto la lista de administradores
    Entonces recibo status_code 200
    Y puedo ver administradores de todos los centros
    Y la lista incluye administradores de centros 1, 2 y 3

  @admins @create
  Escenario: SUPERADMIN puede crear nuevos administradores
    Cuando creo un administrador con:
      | campo              | valor                     |
      | email              | nuevo.admin@test.com      |
      | password           | password123               |
      | nombre             | Nuevo                     |
      | apellido           | Administrador             |
      | dni                | 99999999                  |
      | centroAtencionId   | 1                         |
    Entonces el administrador se crea exitosamente con status_code 200
    Y el nuevo administrador está asignado al centro 1

  @admins @create @validation
  Escenario: SUPERADMIN no puede crear admin con email duplicado
    Dado que existe el admin "admin.santamaria@turnero.com"
    Cuando intento crear un administrador con email "admin.santamaria@turnero.com"
    Entonces recibo un error de validación (400 o 409)
    Y el mensaje indica que el email ya existe

  @admins @create @cross-center
  Escenario: SUPERADMIN puede asignar admin a cualquier centro
    Cuando creo un administrador asignándolo al centro 3
    Entonces el administrador se crea exitosamente
    Y queda asignado al centro 3 "Consultorios del Sol"

  # =====================================================================
  # ACCESO A OPERADORES DE TODOS LOS CENTROS
  # =====================================================================

  @operadores @read
  Escenario: SUPERADMIN puede ver operadores de todos los centros
    Cuando consulto la lista de operadores
    Entonces recibo status_code 200
    Y puedo ver operadores del centro 1
    Y puedo ver operadores del centro 2
    Y puedo ver operadores del centro 3

  @operadores @read @filter
  Escenario: SUPERADMIN puede filtrar operadores por centro
    Cuando consulto operadores filtrando por centro 1
    Entonces solo veo operadores asignados al centro 1
    Y no veo operadores de otros centros

  # =====================================================================
  # ACCESO A MÉDICOS (GLOBAL)
  # =====================================================================

  @medicos @read
  Escenario: SUPERADMIN puede ver todos los médicos del sistema
    Cuando consulto la lista de médicos
    Entonces recibo status_code 200
    Y puedo ver todos los médicos sin restricción de centro

  @medicos @create
  Escenario: SUPERADMIN puede crear médicos
    Cuando creo un médico con:
      | campo      | valor                 |
      | nombre     | Test                  |
      | apellido   | Médico                |
      | email      | test.medico@test.com  |
      | dni        | 88888888              |
      | matricula  | MAT-99999             |
    Entonces el médico se crea exitosamente

  # =====================================================================
  # ACCESO A STAFF MÉDICO DE TODOS LOS CENTROS
  # =====================================================================

  @staff @read
  Escenario: SUPERADMIN puede ver staff médico de cualquier centro
    Cuando consulto el staff médico del centro 1
    Entonces recibo status_code 200
    Y veo los médicos asociados al centro 1

  @staff @read @all
  Escenario: SUPERADMIN puede ver todo el staff médico del sistema
    Cuando consulto todo el staff médico
    Entonces recibo status_code 200
    Y veo asociaciones de médicos con múltiples centros

  # =====================================================================
  # ACCESO A CONSULTORIOS DE TODOS LOS CENTROS
  # =====================================================================

  @consultorios @read
  Escenario: SUPERADMIN puede ver consultorios de todos los centros
    Cuando consulto los consultorios
    Entonces recibo status_code 200
    Y veo consultorios del centro 1
    Y veo consultorios del centro 2
    Y veo consultorios del centro 3

  @consultorios @filter
  Escenario: SUPERADMIN puede filtrar consultorios por centro
    Cuando consulto consultorios del centro 2
    Entonces solo veo consultorios de "Clínica del Sur"
    Y los consultorios tienen el centroAtencionId correcto

  # =====================================================================
  # ACCESO A TURNOS DE TODOS LOS CENTROS
  # =====================================================================

  @turnos @read
  Escenario: SUPERADMIN puede ver turnos de todos los centros
    Cuando consulto los turnos
    Entonces recibo status_code 200
    Y puedo ver turnos sin restricción de centro

  @turnos @read @paginado
  Escenario: SUPERADMIN puede paginar turnos de cualquier centro
    Cuando consulto turnos paginados con page 0 y size 10
    Entonces recibo status_code 200
    Y la respuesta incluye metadatos de paginación

  # =====================================================================
  # ACCESO A ESPECIALIDADES (GLOBAL)
  # =====================================================================

  @especialidades @read
  Escenario: SUPERADMIN puede ver todas las especialidades
    Cuando consulto las especialidades
    Entonces recibo status_code 200
    Y veo todas las especialidades del sistema

  @especialidades @create
  Escenario: SUPERADMIN puede crear especialidades
    Cuando creo una especialidad con nombre "Especialidad Test"
    Entonces la especialidad se crea exitosamente

  # =====================================================================
  # ACCESO A PACIENTES (GLOBAL)
  # =====================================================================

  @pacientes @read
  Escenario: SUPERADMIN puede ver todos los pacientes
    Cuando consulto los pacientes
    Entonces recibo status_code 200
    Y veo todos los pacientes del sistema

  # =====================================================================
  # ACCESO A OBRAS SOCIALES (GLOBAL)
  # =====================================================================

  @obras-sociales @read
  Escenario: SUPERADMIN puede ver todas las obras sociales
    Cuando consulto las obras sociales
    Entonces recibo status_code 200
    Y veo todas las obras sociales del sistema

  # =====================================================================
  # VERIFICACIÓN DE NO RESTRICCIÓN
  # =====================================================================

  @no-restriction
  Escenario: SUPERADMIN no tiene restricción por TenantContext
    Dado que consulto datos del centro 1
    Y luego consulto datos del centro 2
    Y luego consulto datos del centro 3
    Entonces todas las consultas son exitosas
    Y no recibo errores de acceso denegado
