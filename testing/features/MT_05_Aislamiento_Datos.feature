# language: es

@aislamiento @multi-tenant @critical
Característica: Aislamiento de Datos Multi-Tenant

  Como arquitectura SaaS multi-tenant
  Necesito garantizar que los datos de un centro NO sean accesibles desde otro centro
  Para mantener la privacidad y seguridad de cada tenant

  Antecedentes:
    Dado que existen 3 centros de atención configurados:
      | id | nombre                | admin                        |
      | 1  | Clínica Santa María   | admin.santamaria@turnero.com  |
      | 2  | Clínica del Sur       | admin.delsur@turnero.com        |
      | 3  | Consultorios del Sol  | admin.delsol@turnero.com        |
    Y cada centro tiene operadores, consultorios y médicos asignados

  # =====================================================================
  # SECCIÓN 1: AISLAMIENTO DE OPERADORES
  # =====================================================================

  @operadores @isolation
  Escenario: Operadores del Centro 1 NO son visibles desde Centro 2
    Dado que me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando consulto la lista de operadores
    Entonces NO veo a "operador1.santamaria@turnero.com"
    Y NO veo a "operador2.santamaria@turnero.com"
    Y solo veo operadores de mi centro (2)

  @operadores @isolation
  Escenario: Operadores del Centro 2 NO son visibles desde Centro 3
    Dado que me autentico como "admin.delsol@turnero.com" con password "password"
    Cuando consulto la lista de operadores
    Entonces NO veo a "operador1.delsur@turnero.com"
    Y NO veo a "operador2.delsur@turnero.com"
    Y solo veo operadores de mi centro (3)

  @operadores @direct-access @forbidden
  Esquema del escenario: Acceso directo a operador de otro centro denegado
    Dado que me autentico como "<admin_email>" con password "password"
    Y conozco el ID del operador "<operador_otro_centro>"
    Cuando consulto GET /operadores/{id} con ese ID
    Entonces recibo status_code 403 o 404
    Y NO veo los datos del operador

    Ejemplos:
      | admin_email                  | operador_otro_centro     |
      | admin.santamaria@turnero.com  | operador1.delsur@turnero.com|
      | admin.delsur@turnero.com        | operador1.santamaria@turnero.com |
      | admin.delsol@turnero.com        | operador1.delsur@turnero.com|

  # =====================================================================
  # SECCIÓN 2: AISLAMIENTO DE CONSULTORIOS
  # =====================================================================

  @consultorios @isolation
  Escenario: Consultorios del Centro 1 NO son visibles desde Centro 2
    Dado que me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando consulto los consultorios de mi centro
    Entonces NO veo "Consultorio A"
    Y NO veo "Consultorio B"
    Y solo veo consultorios que pertenecen al centro 2

  @consultorios @isolation
  Esquema del escenario: Cada centro solo ve sus propios consultorios
    Dado que me autentico como "<email>" con password "password"
    Cuando consulto los consultorios de mi centro
    Entonces veo exactamente <cantidad> consultorios
    Y todos pertenecen al centro <centro_id>
    Y NO veo consultorios de otros centros

    Ejemplos:
      | email                        | centro_id | cantidad |
      | admin.santamaria@turnero.com  | 1         | 4        |
      | admin.delsur@turnero.com        | 2         | 4        |
      | admin.delsol@turnero.com        | 3         | 4        |

  @consultorios @direct-access @forbidden
  Escenario: Acceso directo a consultorio de otro centro denegado
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Y conozco el ID de un consultorio del centro 2
    Cuando consulto GET /consultorios/{id} con ese ID
    Entonces recibo status_code 403 o 404
    Y NO veo los datos del consultorio

  # =====================================================================
  # SECCIÓN 3: AISLAMIENTO DE TURNOS
  # =====================================================================

  @turnos @isolation
  Escenario: Turnos del Centro 1 NO son visibles desde Centro 2
    Dado que existen turnos en el centro 1
    Y me autentico como "operador1.delsur@turnero.com" con password "password"
    Cuando consulto los turnos
    Entonces NO veo ningún turno del centro 1
    Y solo veo turnos de mi centro (2)

  @turnos @isolation @paginado
  Escenario: Paginación de turnos respeta aislamiento multi-tenant
    Dado que existen turnos en los centros 1, 2 y 3
    Y me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto GET /turno/page?page=0&size=100
    Entonces el totalElements solo cuenta turnos del centro 1
    Y el content solo contiene turnos del centro 1

  @turnos @direct-access @forbidden
  Escenario: Acceso directo a turno de otro centro denegado
    Dado que existe un turno en el centro 2 con ID conocido
    Y me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto GET /turno/{id} con ese ID
    Entonces recibo status_code 403 o 404
    Y NO veo los datos del turno

  @turnos @modification @forbidden
  Escenario: Modificación de turno de otro centro denegada
    Dado que existe un turno programado en el centro 2
    Y me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando intento PUT /turno/{id} para modificar ese turno
    Entonces recibo status_code 403 o 404
    Y el turno NO es modificado

  @turnos @cancellation @forbidden
  Escenario: Cancelación de turno de otro centro denegada
    Dado que existe un turno programado en el centro 2
    Y me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando intento PUT /turno/{id}/cancelar
    Entonces recibo status_code 403 o 404
    Y el turno mantiene su estado original

  # =====================================================================
  # SECCIÓN 4: AISLAMIENTO DE STAFF MÉDICO
  # =====================================================================

  @staff @isolation
  Escenario: Staff médico del Centro 1 NO visible desde Centro 2
    Dado que hay médicos asociados al centro 1
    Y me autentico como "admin.delsur@turnero.com" con password "password"
    Cuando consulto el staff médico de mi centro
    Entonces solo veo asociaciones del centro 2
    Y NO veo asociaciones del centro 1

  @staff @isolation
  Esquema del escenario: Staff médico aislado por centro
    Dado que me autentico como "<email>" con password "password"
    Cuando consulto GET /staff-medico/centro/<centro_id>
    Entonces recibo status_code 200
    Y todas las asociaciones pertenecen al centro <centro_id>

    Ejemplos:
      | email                        | centro_id |
      | admin.santamaria@turnero.com  | 1         |
      | admin.delsur@turnero.com        | 2         |
      | admin.delsol@turnero.com        | 3         |

  @staff @cross-access @forbidden
  Escenario: Admin no puede consultar staff de otro centro
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto GET /staff-medico/centro/2
    Entonces recibo status_code 403 o lista vacía
    Y NO veo asociaciones del centro 2

  # =====================================================================
  # SECCIÓN 5: MÉDICO COMPARTIDO ENTRE CENTROS
  # =====================================================================

  @medico-compartido @special-case
  Escenario: Médico trabaja en múltiples centros - Admin ve solo su asociación
    Dado que el médico "Dr. González" está asociado a centros 1 y 2
    Y me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando consulto el staff médico del centro 1
    Entonces veo la asociación del Dr. González con el centro 1
    Y NO veo la asociación del Dr. González con el centro 2

  @medico-compartido @special-case
  Escenario: Médico trabaja en múltiples centros - Cada admin ve datos correctos
    Dado que el médico "Dr. González" está asociado a centros 1 y 2
    Cuando "admin.santamaria@turnero.com" consulta staff del centro 1
    Entonces ve especialidades y horarios del centro 1
    Cuando "admin.delsur@turnero.com" consulta staff del centro 2
    Entonces ve especialidades y horarios del centro 2
    Y los datos son independientes entre centros

  # =====================================================================
  # SECCIÓN 6: CONFLICTOS DE HORARIO STAFF MÉDICO (CASO ESPECIAL)
  # =====================================================================

  @staff @horarios @conflict
  Escenario: Detectar conflicto de horarios de médico entre centros
    Dado que el médico "Dr. González" trabaja en centro 1 los Lunes de 8:00 a 12:00
    Cuando un admin del centro 2 intenta asignar al mismo médico Lunes 10:00 a 14:00
    Entonces el sistema detecta solapamiento de horarios
    Y muestra advertencia de conflicto entre centros

  @staff @horarios @no-conflict
  Escenario: Médico puede trabajar en horarios no solapados entre centros
    Dado que el médico "Dr. González" trabaja en centro 1 los Lunes de 8:00 a 12:00
    Cuando un admin del centro 2 asigna al mismo médico Lunes 14:00 a 18:00
    Entonces la asignación es exitosa
    Y NO hay conflicto de horarios

  @staff @horarios @same-day-different-center
  Escenario: Médico puede trabajar en diferentes centros el mismo día sin conflicto
    Dado que el médico trabaja en centro 1 de 8:00 a 12:00
    Y en centro 2 de 14:00 a 18:00
    Cuando consulto la disponibilidad del médico
    Entonces veo que está ocupado en ambos rangos horarios
    Y los turnos se asignan correctamente respetando ambos centros

  # =====================================================================
  # SECCIÓN 7: SUPERADMIN VE TODO (EXCEPCIÓN VÁLIDA)
  # =====================================================================

  @superadmin @global-access
  Escenario: SUPERADMIN puede ver datos de todos los centros
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Cuando consulto los operadores
    Entonces veo operadores de los 3 centros
    Y la cantidad total es 6 (2 por centro)

  @superadmin @global-access
  Escenario: SUPERADMIN puede ver consultorios de todos los centros
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Cuando consulto los consultorios
    Entonces veo consultorios de los 3 centros
    Y la cantidad total es 12 (4 por centro)

  @superadmin @global-access
  Escenario: SUPERADMIN puede ver turnos de todos los centros
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Cuando consulto los turnos paginados
    Entonces el resultado incluye turnos de múltiples centros

  # =====================================================================
  # SECCIÓN 8: VERIFICACIÓN DE INTEGRIDAD DE DATOS
  # =====================================================================

  @integrity @creation
  Escenario: Operador creado siempre pertenece al centro del admin
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando creo un operador sin especificar centroAtencionId
    Entonces el operador se crea con centroAtencionId = 1
    Y es visible solo desde el centro 1

  @integrity @creation
  Escenario: Intentar crear operador en otro centro es ignorado o rechazado
    Dado que me autentico como "admin.santamaria@turnero.com" con password "password"
    Cuando creo un operador forzando centroAtencionId = 2
    Entonces el operador se crea con centroAtencionId = 1
    Y recibo error de validación

  @integrity @no-data-leak
  Escenario: Listados no filtran datos de otros centros por error
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto cualquier endpoint de listado
    Entonces ningún registro tiene centroAtencionId diferente de 1
    Y la respuesta no contiene referencias a otros centros

  # =====================================================================
  # SECCIÓN 9: ESCENARIOS DE ATAQUE / SEGURIDAD
  # =====================================================================

  @security @parameter-tampering
  Escenario: Intentar acceder a recursos modificando IDs en URL
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Y conozco IDs de recursos del centro 2
    Cuando intento acceder a /turno/<id_centro_2>
    Entonces recibo status_code 403 o 404
    Y NO obtengo datos del recurso

  @security @filter-bypass
  Escenario: Intentar bypass de filtro enviando centroAtencionId en body
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando hago POST incluyendo centroAtencionId: 2 en el body
    Entonces el sistema ignora ese valor
    Y usa el centro del token JWT (centro 1)

  @security @sql-injection-like
  Escenario: Parámetros maliciosos no exponen datos de otros centros
    Dado que me autentico como "operador1.santamaria@turnero.com" con password "password"
    Cuando consulto con parámetros de búsqueda inusuales
    Entonces solo recibo datos de mi centro
    Y NO se filtran datos de otros centros
