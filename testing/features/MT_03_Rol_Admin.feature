# language: es

@rol @admin @multi-tenant
Característica: Permisos y Acceso del ADMINISTRADOR (Tenant-Bound)

  Como ADMINISTRADOR de un centro de atención
  Solo tengo acceso a los recursos de mi centro asignado
  Y puedo gestionar operadores, médicos y turnos de mi centro

  # =====================================================================
  # SECCIÓN 1: ADMIN DEL CENTRO 1 - CLÍNICA SANTA MARÍA
  # =====================================================================

  @centro1
  Escenario: Setup Admin Centro 1
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Entonces verifico que mi rol es ADMINISTRADOR
    Y mi centroAtencionId es 1
    Y mi centro es "Clínica Santa María"

  # ----- OPERADORES -----

  @centro1 @operadores @read
  Escenario: ADMIN Centro 1 solo ve operadores de su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto la lista de operadores
    Entonces recibo status_code 200
    Y solo veo operadores con centroAtencionId 1
    Y veo a "operador1.santamaria@turnero.com"
    Y veo a "operador2.santamaria@turnero.com"
    Y NO veo operadores de otros centros

  @centro1 @operadores @create
  Escenario: ADMIN Centro 1 puede crear operadores en su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando creo un operador con:
      | campo    | valor                        |
      | email    | nuevo.op.sm@turnero.com      |
      | password | password123                  |
      | nombre   | Nuevo                        |
      | apellido | Operador SM                  |
      | dni      | 77777777                     |
    Entonces el operador se crea exitosamente
    Y el operador queda asignado automáticamente al centro 1
    Y NO necesité especificar centroAtencionId

  @centro1 @operadores @create @forbidden
  Escenario: ADMIN Centro 1 NO puede crear operadores en otro centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando intento crear un operador forzando centroAtencionId a 2
    Entonces recibo status_code 403
    Y el mensaje indica acceso denegado

  # ----- CONSULTORIOS -----

  @centro1 @consultorios @read
  Escenario: ADMIN Centro 1 solo ve consultorios de su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto los consultorios del centro 1
    Entonces recibo status_code 200
    Y veo consultorios "Consultorio A", "Consultorio B", "Consultorio C", "Consultorio D"
    Y todos pertenecen al centro 1

  @centro1 @consultorios @create
  Escenario: ADMIN Centro 1 puede crear consultorios en su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando creo un consultorio con:
      | campo              | valor                |
      | nombre             | Consultorio Test     |
      | centroAtencionId   | 1                    |
    Entonces el consultorio se crea exitosamente
    Y queda asignado al centro 1

  # ----- MÉDICOS -----

  @centro1 @medicos @read
  Escenario: ADMIN Centro 1 puede ver médicos disponibles
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto los médicos disponibles
    Entonces recibo status_code 200
    Y veo la lista de médicos del sistema

  @centro1 @medicos @create
  Escenario: ADMIN Centro 1 puede crear médicos y asociarlos a su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando creo un médico usando el endpoint /medicos/create-by-admin con:
      | campo      | valor                    |
      | nombre     | Doctor                   |
      | apellido   | Test Centro1             |
      | email      | dr.test.c1@email.com     |
      | dni        | 66666666                 |
      | matricula  | MAT-66666                |
    Entonces el médico se crea exitosamente
    Y se crea automáticamente una asociación staff-medico con el centro 1

  # ----- STAFF MÉDICO -----

  @centro1 @staff @read
  Escenario: ADMIN Centro 1 solo ve staff médico de su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto el staff médico del centro 1
    Entonces recibo status_code 200
    Y veo las asociaciones médico-centro para el centro 1

  @centro1 @staff @read @forbidden
  Escenario: ADMIN Centro 1 NO puede ver staff médico del centro 2
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto el staff médico del centro 2
    Entonces recibo lista vacía o solo datos de mi centro
    Y recibo status_code 403

  # ----- TURNOS -----

  @centro1 @turnos @read
  Escenario: ADMIN Centro 1 solo ve turnos de su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto los turnos
    Entonces recibo status_code 200
    Y solo veo turnos de consultorios del centro 1
    Y NO veo turnos de otros centros

  @centro1 @turnos @create
  Escenario: ADMIN Centro 1 puede crear turnos en su centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Y existe un consultorio en el centro 1
    Y existe un paciente en el sistema
    Cuando creo un turno en un consultorio del centro 1
    Entonces el turno se crea exitosamente

  # =====================================================================
  # SECCIÓN 2: ADMIN DEL CENTRO 2 - CLÍNICA DEL SUR
  # =====================================================================

  @centro2
  Escenario: Setup Admin Centro 2
    Dado que me autentico como "admin.delsur@turnero.com" con password "password"
    Entonces verifico que mi rol es ADMINISTRADOR
    Y mi centroAtencionId es 2
    Y mi centro es "Clínica del Sur"

  @centro2 @operadores @read
  Escenario: ADMIN Centro 2 solo ve operadores de su centro
    Dado que me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando consulto la lista de operadores
    Entonces recibo status_code 200
    Y solo veo operadores con centroAtencionId 2
    Y veo a "operador1.delsur@turnero.com"
    Y veo a "operador2.delsur@turnero.com"
    Y NO veo a "operador1.santamaria@turnero.com"

  @centro2 @consultorios @read
  Escenario: ADMIN Centro 2 solo ve consultorios de su centro
    Dado que me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando consulto los consultorios del centro 2
    Entonces recibo status_code 200
    Y veo consultorios "Consultorio Sur 1", "Consultorio Sur 2", "Consultorio Sur 3", "Consultorio Sur 4"
    Y todos pertenecen al centro 2

  # =====================================================================
  # SECCIÓN 3: ADMIN DEL CENTRO 3 - CONSULTORIOS DEL SOL
  # =====================================================================

  @centro3
  Escenario: Setup Admin Centro 3
    Dado que me autentico como "admin.delsol@turnero.com" con password "password"
    Entonces verifico que mi rol es ADMINISTRADOR
    Y mi centroAtencionId es 3
    Y mi centro es "Consultorios del Sol"

  @centro3 @operadores @read
  Escenario: ADMIN Centro 3 solo ve operadores de su centro
    Dado que me autentico como "admin.delsol@turnero.com" con password "password"
    Cuando consulto la lista de operadores
    Entonces recibo status_code 200
    Y solo veo operadores con centroAtencionId 3
    Y veo a "operador1.delsol@turnero.com"
    Y veo a "operador2.delsol@turnero.com"
    Y NO veo operadores del centro 1 ni del centro 2

  # =====================================================================
  # SECCIÓN 4: RESTRICCIONES CROSS-TENANT
  # =====================================================================

  @cross-tenant @forbidden
  Escenario: ADMIN de un centro NO puede modificar operadores de otro centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Y existe el operador "operador1.delsur@turnero.com" del centro 2
    Cuando intento modificar ese operador
    Entonces recibo status_code 403 o 404
    Y el operador NO es modificado

  @cross-tenant @forbidden
  Escenario: ADMIN de un centro NO puede eliminar operadores de otro centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Y conozco el ID de un operador del centro 2
    Cuando intento eliminar ese operador
    Entonces recibo status_code 403 o 404
    Y el operador sigue existiendo

  @cross-tenant @forbidden
  Escenario: ADMIN de un centro NO puede crear admins (solo SUPERADMIN)
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando intento crear un administrador via POST /admins
    Entonces recibo status_code 403
    Y el mensaje indica acceso denegado

  @cross-tenant @forbidden
  Escenario: ADMIN de un centro NO puede ver admins de otros centros
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto la lista de administradores
    Entonces recibo status_code 403
    Y solo veo mi propia información

  # =====================================================================
  # SECCIÓN 5: VERIFICACIÓN DE AISLAMIENTO POR CENTRO
  # =====================================================================

  @isolation
  Esquema del escenario: Cada ADMIN solo ve datos de su propio centro
    Dado que me autentico como "<email>" con password "password"
    Cuando consulto los operadores
    Entonces solo veo operadores del centro <centro_id>
    Y la cantidad de operadores es <cantidad>

    Ejemplos:
      | email                        | centro_id | cantidad |
      | admin.santamaria@turnero.com  | 1         | 2        |
      | admin.delsur@turnero.com        | 2         | 2        |
      | admin.delsol@turnero.com        | 3         | 2        |

  @isolation @consultorios
  Esquema del escenario: Cada ADMIN solo ve consultorios de su centro
    Dado que me autentico como "<email>" con password "password"
    Cuando consulto los consultorios de mi centro
    Entonces solo veo consultorios del centro <centro_id>
    Y la cantidad de consultorios es <cantidad>

    Ejemplos:
      | email                        | centro_id | cantidad |
      | admin.santamaria@turnero.com  | 1         | 4        |
      | admin.delsur@turnero.com        | 2         | 4        |
      | admin.delsol@turnero.com        | 3         | 4        |
