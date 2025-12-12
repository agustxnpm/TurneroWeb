# language: es

@smoke @multi-tenant
Característica: Smoke Tests - Verificación de servicios básicos

  Como QA
  Quiero verificar que los servicios básicos estén funcionando
  Para asegurarme que el sistema está operativo antes de correr tests más complejos

  Antecedentes:
    Dado que el sistema multi-tenant está operativo

  # =====================================================================
  # VERIFICACIÓN DE CONECTIVIDAD
  # =====================================================================
  
  @health
  Escenario: Verificar que el backend está online
    Cuando consulto el endpoint raíz del backend
    Entonces recibo status_code 200
    Y el mensaje contiene "Server Online"

  # =====================================================================
  # VERIFICACIÓN DE ENDPOINTS PÚBLICOS
  # =====================================================================

  @auth @public
  Escenario: Verificar endpoint de login accesible
    Cuando intento hacer login sin credenciales
    Entonces el login falla con error de validación
    Y el sistema responde con estructura JSON válida

  @centros @public
  Escenario: Verificar que existen centros de atención cargados
    Cuando consulto los centros de atención sin autenticación
    Entonces recibo una respuesta válida con centros
    Y existen al menos 3 centros de atención

  # =====================================================================
  # VERIFICACIÓN DE DATOS DE PRUEBA
  # =====================================================================

  @data-check
  Escenario: Verificar datos de prueba cargados correctamente
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Cuando consulto los centros de atención
    Entonces existen los siguientes centros:
      | nombre                   |
      | Clínica Santa María      |
      | Clínica del Sur          |
      | Consultorios del Sol     |

  @data-check
  Escenario: Verificar usuarios de prueba por centro
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Cuando consulto los administradores
    Entonces existen administradores asignados a cada centro

  # =====================================================================
  # VERIFICACIÓN DE RESPUESTA ESTÁNDAR
  # =====================================================================

  @response-format
  Esquema del escenario: Verificar formato de respuesta estándar en todos los endpoints
    Dado que me autentico como "superadmin@turnero.com" con password "password"
    Cuando consulto el endpoint "<endpoint>"
    Entonces la respuesta tiene la estructura:
      | campo       | tipo    |
      | status_code | number  |
      | status_text | string  |
      | data        | any     |

    Ejemplos:
      | endpoint           |
      | /centrosAtencion   |
      | /admins            |
      | /operadores        |
      | /medicos           |
      | /consultorios      |
      | /especialidades    |

  # =====================================================================
  # VERIFICACIÓN DE AUTENTICACIÓN JWT
  # =====================================================================

  @jwt
  Escenario: Verificar que el login retorna JWT con centroAtencionId
    Cuando hago login con "admin.santamaria@turnero.com" y "password"
    Entonces el login es exitoso
    Y la respuesta incluye "accessToken"
    Y la respuesta incluye "refreshToken"
    Y la respuesta incluye "centroAtencionId"
    Y el centroAtencionId corresponde a "Clínica Santa María"

  @jwt
  Escenario: Verificar que SUPERADMIN tiene centroAtencionId null
    Cuando hago login con "superadmin@turnero.com" y "password"
    Entonces el login es exitoso
    Y la respuesta incluye "centroAtencionId"
    Y el centroAtencionId es null

  @jwt @refresh
  Escenario: Verificar refresh token funciona correctamente
    Dado que hago login con "admin.santamaria@turnero.com" y "password"
    Y guardo el refreshToken
    Cuando solicito un nuevo accessToken con el refreshToken
    Entonces recibo un nuevo accessToken válido
    Y el centroAtencionId se mantiene igual
