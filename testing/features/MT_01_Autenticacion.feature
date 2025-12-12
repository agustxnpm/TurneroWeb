# language: es

@auth @multi-tenant
Característica: Autenticación y Autorización Multi-Tenant

  Como sistema SaaS multi-tenant
  Necesito validar que la autenticación funcione correctamente
  Y que cada rol tenga acceso solo a los recursos permitidos

  Antecedentes:
    Dado que el sistema multi-tenant está operativo
    Y existen los datos de prueba cargados

  # =====================================================================
  # LOGIN POR ROL - VERIFICACIÓN DE RESPUESTA
  # =====================================================================

  @login @superadmin
  Escenario: Login exitoso como SUPERADMIN
    Cuando hago login con "superadmin@turnero.com" y "password"
    Entonces el login es exitoso con status_code 200
    Y el rol retornado es "SUPERADMIN"
    Y el centroAtencionId es null
    Y puedo acceder a recursos de cualquier centro

  @login @admin
  Esquema del escenario: Login exitoso como ADMIN de diferentes centros
    Cuando hago login con "<email>" y "password"
    Entonces el login es exitoso con status_code 200
    Y el rol retornado es "ADMINISTRADOR"
    Y el centroAtencionId es <centro_id>
    Y el fullName contiene "<nombre_esperado>"

    Ejemplos: Administradores por centro
      | email                         | centro_id | nombre_esperado        |
      | admin.santamaria@turnero.com   | 1         | Carlos Rodríguez   |
      | admin.delsur@turnero.com         | 2         | Laura Fernández       |
      | admin.delsol@turnero.com         | 3         | Roberto Sánchez        |

  @login @operador
  Esquema del escenario: Login exitoso como OPERADOR de diferentes centros
    Cuando hago login con "<email>" y "password"
    Entonces el login es exitoso con status_code 200
    Y el rol retornado es "OPERADOR"
    Y el centroAtencionId es <centro_id>

    Ejemplos: Operadores por centro
      | email                       | centro_id |
      | operador1.santamaria@turnero.com    | 1         |
      | operador2.santamaria@turnero.com    | 1         |
      | operador1.delsur@turnero.com   | 2         |
      | operador2.delsur@turnero.com   | 2         |
      | operador1.delsol@turnero.com   | 3         |
      | operador2.delsol@turnero.com   | 3         |

  @login @medico
  Escenario: Login exitoso como MEDICO (acceso global)
    Cuando hago login con "medico@turnero.com" y "password"
    Entonces el login es exitoso con status_code 200
    Y el rol retornado es "MEDICO"
    Y el centroAtencionId es null

  @login @paciente
  Esquema del escenario: Login exitoso como PACIENTE (acceso global)
    Cuando hago login con "<email>" y "password"
    Entonces el login es exitoso con status_code 200
    Y el rol retornado es "PACIENTE"
    Y el centroAtencionId es null

    Ejemplos: Pacientes
      | email                    |
      | aguspalqui@hotmail.com     |
      | paciente1.santamaria@turnero.com   |
      | paciente1.delsur@turnero.com|

  # =====================================================================
  # LOGIN FALLIDOS
  # =====================================================================
  # NOTA: Estos tests están deshabilitados en modo desarrollo (SECURITY_DEV_MODE=true)
  # Habilitar cuando se configure seguridad completa en producción

  @login @error @production-only @wip
  Escenario: Login fallido con credenciales incorrectas
    Cuando hago login con "admin.santamaria@turnero.com" y "wrongpassword"
    Entonces el login falla con status_code 401
    Y el mensaje indica credenciales inválidas

  @login @error @production-only @wip
  Escenario: Login fallido con usuario inexistente
    Cuando hago login con "noexiste@turnero.com" y "password"
    Entonces el login falla con status_code 401
    Y el mensaje indica credenciales inválidas

  @login @error @production-only @wip
  Escenario: Login fallido sin credenciales
    Cuando hago login sin proporcionar credenciales
    Entonces el login falla con error de validación

  # =====================================================================
  # ACCESO A ENDPOINTS PROTEGIDOS SIN AUTENTICACIÓN
  # =====================================================================
  # NOTA: Estos tests están deshabilitados en modo desarrollo (SECURITY_DEV_MODE=true)
  # En devMode, anyRequest().permitAll() permite acceso sin JWT

  @unauthorized @production-only @wip
  Esquema del escenario: Acceso denegado a endpoints protegidos sin JWT
    Cuando consulto el endpoint "<endpoint>" sin autenticación
    Entonces recibo status_code 401 o 403
    Y el acceso es denegado

    Ejemplos: Endpoints protegidos
      | endpoint             |
      | /admins              |
      | /operadores          |
      | /turno               |
      | /staff-medico        |

  # =====================================================================
  # REFRESH TOKEN
  # =====================================================================

  @refresh-token
  Escenario: Refresh token válido genera nuevo access token
    Dado que hago login con "admin.santamaria@turnero.com" y "password"
    Y guardo el accessToken y refreshToken
    Cuando solicito refresh con el refreshToken válido
    Entonces recibo un nuevo accessToken
    Y el nuevo token contiene el mismo centroAtencionId

  @refresh-token @error @production-only @wip
  Escenario: Refresh token inválido es rechazado
    Cuando solicito refresh con un token "invalid_refresh_token"
    Entonces el refresh falla con status_code 401 o 403

  @refresh-token @error @production-only @wip
  Escenario: Refresh token expirado es rechazado
    Dado que tengo un refreshToken expirado
    Cuando solicito refresh con ese token
    Entonces el refresh falla con status_code 401 o 403

  # =====================================================================
  # MÚLTIPLES ROLES
  # =====================================================================

  @multi-role
  Escenario: Usuario con múltiples roles retorna todos los roles
    Dado que existe un usuario con roles PACIENTE y MEDICO
    Cuando hago login con ese usuario
    Entonces la respuesta incluye "roles"
    Y roles contiene múltiples roles

  # =====================================================================
  # SESIONES CONCURRENTES
  # =====================================================================
  # NOTA: En devMode los tokens pueden ser idénticos si no hay lógica de refresh

  @concurrent @wip
  Escenario: Múltiples logins del mismo usuario generan tokens diferentes
    Cuando hago login con "admin.santamaria@turnero.com" y "password"
    Y guardo el accessToken como token1
    Y hago login nuevamente con "admin.santamaria@turnero.com" y "password"
    Y guardo el accessToken como token2
    Entonces token1 y token2 son diferentes
    Y ambos tokens son válidos
