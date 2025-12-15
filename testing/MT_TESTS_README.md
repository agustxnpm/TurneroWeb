# Suite de Tests Multi-Tenant - TurneroWeb

## Descripción General

Esta suite de tests de aceptación valida el comportamiento de la arquitectura SaaS multi-tenant del sistema TurneroWeb. Los tests están escritos en Cucumber.js usando el formato Gherkin en español.

## Estructura de Archivos

```
testing/features/
├── MT_00_SmokeTests.feature          # Tests de humo y verificación básica
├── MT_01_Autenticacion.feature       # Tests de autenticación y JWT
├── MT_02_Rol_SuperAdmin.feature      # Tests de permisos SUPERADMIN
├── MT_03_Rol_Admin.feature           # Tests de permisos ADMINISTRADOR
├── MT_04_Rol_Operador.feature        # Tests de permisos OPERADOR
├── MT_05_Aislamiento_Datos.feature   # Tests de aislamiento multi-tenant
└── step_definitions/
    ├── MT_Helpers.js                 # Funciones auxiliares y constantes
    ├── MT_CommonSteps.js             # Steps comunes a todas las features
    ├── MT_CRUDSteps.js               # Steps para operaciones CRUD
    └── MT_IsolationSteps.js          # Steps para verificación de aislamiento
```

## Tags Disponibles

### Por Categoría
- `@smoke` - Tests de verificación básica del sistema
- `@auth` - Tests relacionados con autenticación
- `@multi-tenant` - Tests específicos de multi-tenancy
- `@critical` - Tests críticos para la seguridad

### Por Rol
- `@superadmin` - Tests del rol SUPERADMIN
- `@admin` - Tests del rol ADMINISTRADOR  
- `@operador` - Tests del rol OPERADOR
- `@medico` - Tests del rol MEDICO
- `@paciente` - Tests del rol PACIENTE

### Por Entidad
- `@centros` - Tests de Centros de Atención
- `@admins` - Tests de Administradores
- `@operadores` - Tests de Operadores
- `@medicos` - Tests de Médicos
- `@consultorios` - Tests de Consultorios
- `@turnos` - Tests de Turnos
- `@staff` - Tests de Staff Médico
- `@especialidades` - Tests de Especialidades

### Por Operación
- `@read` - Tests de lectura (GET)
- `@create` - Tests de creación (POST)
- `@update` - Tests de actualización (PUT)
- `@delete` - Tests de eliminación (DELETE)
- `@forbidden` - Tests de acceso denegado

### Por Centro
- `@centro1` - Tests específicos del Centro 1 (Clínica Santa María)
- `@centro2` - Tests específicos del Centro 2 (Clínica del Sur)
- `@centro3` - Tests específicos del Centro 3 (Consultorios del Sol)

### Otros
- `@isolation` - Tests de aislamiento de datos
- `@cross-tenant` - Tests de acceso entre centros
- `@security` - Tests de seguridad
- `@jwt` - Tests específicos de JWT
- `@workflow` - Tests de flujos de trabajo completos

## Ejecución de Tests

### Ejecutar Todos los Tests
```bash
./lpl test
# O directamente:
cd testing && npm test
```

### Ejecutar por Tag
```bash
# Solo smoke tests
npm test -- --tags "@smoke"

# Tests de un rol específico
npm test -- --tags "@superadmin"
npm test -- --tags "@admin"
npm test -- --tags "@operador"

# Tests de aislamiento
npm test -- --tags "@isolation"

# Tests de seguridad
npm test -- --tags "@security"

# Combinaciones
npm test -- --tags "@admin and @operadores"
npm test -- --tags "@centro1 and @forbidden"
npm test -- --tags "not @smoke"
```

### Ejecutar Feature Específico
```bash
npm test -- features/MT_00_SmokeTests.feature
npm test -- features/MT_05_Aislamiento_Datos.feature
```

## Datos de Prueba

Los tests asumen que los datos de `staging/userinit.sql` están cargados:

### Centros de Atención
| ID | Nombre | Admin |
|----|--------|-------|
| 1 | Clínica Santa María | admin.sta.maria@turnero.com |
| 2 | Clínica del Sur | admin.sur@turnero.com |
| 3 | Consultorios del Sol | admin.sol@turnero.com |

### Usuarios por Rol
| Rol | Email | Centro |
|-----|-------|--------|
| SUPERADMIN | super@turnero.com | NULL (global) |
| ADMINISTRADOR | admin.sta.maria@turnero.com | 1 |
| ADMINISTRADOR | admin.sur@turnero.com | 2 |
| ADMINISTRADOR | admin.sol@turnero.com | 3 |
| OPERADOR | operador1.sm@turnero.com | 1 |
| OPERADOR | operador2.sm@turnero.com | 1 |
| OPERADOR | operador1.sur@turnero.com | 2 |
| OPERADOR | operador2.sur@turnero.com | 2 |
| OPERADOR | operador1.sol@turnero.com | 3 |
| OPERADOR | operador2.sol@turnero.com | 3 |
| MEDICO | dr.gonzalez@email.com | NULL (global) |
| PACIENTE | juan.perez@email.com | NULL (global) |

**Password para todos los usuarios:** `password`

## Comportamiento Esperado por Rol

### SUPERADMIN
- ✅ Acceso global a todos los centros
- ✅ Puede crear administradores
- ✅ Puede ver todos los operadores, turnos, consultorios
- ✅ centroAtencionId es NULL en JWT

### ADMINISTRADOR
- ✅ Solo ve recursos de su centro asignado
- ✅ Puede crear operadores (auto-asignados a su centro)
- ✅ Puede crear médicos (auto-asociados a su centro)
- ❌ NO puede crear administradores
- ❌ NO puede ver recursos de otros centros
- ✅ centroAtencionId es el ID de su centro en JWT

### OPERADOR
- ✅ Solo ve recursos de su centro asignado
- ✅ Puede gestionar turnos de su centro
- ✅ Puede ver/buscar pacientes
- ❌ NO puede crear operadores
- ❌ NO puede crear consultorios
- ❌ NO puede ver recursos de otros centros
- ✅ centroAtencionId es el ID de su centro en JWT

### MEDICO / PACIENTE
- ✅ Acceso global (no restringido por centro)
- ✅ centroAtencionId es NULL en JWT

## Escenarios de Seguridad Testeados

1. **Aislamiento de Datos**: Un usuario de centro 1 NO puede ver datos del centro 2
2. **Acceso Directo Denegado**: Intentar acceder por ID a recursos de otro centro retorna 403/404
3. **Auto-asignación de Centro**: Crear recursos siempre usa el centro del JWT
4. **Parameter Tampering**: Enviar centroAtencionId diferente en el body es ignorado
5. **Endpoints Protegidos**: Acceso sin JWT retorna 401/403
6. **Permisos por Rol**: Cada rol solo puede acceder a sus endpoints permitidos

## Reportes

Los tests generan reportes en formato HTML y JSON:

```bash
# Generar reporte detallado
npm test -- --format json:reports/cucumber-report.json --format html:reports/cucumber-report.html
```

## Troubleshooting

### Error: "Cannot connect to backend"
- Verificar que los contenedores Docker estén corriendo: `./lpl up`
- Verificar que el backend está accesible: `curl http://backend:8080/`

### Error: "Login failed"
- Verificar que los datos de prueba están cargados
- Ejecutar: `psql -f staging/userinit.sql` dentro del contenedor de base de datos

### Tests Fallan con 403
- Verificar que el rol del usuario tiene permisos para la operación
- Revisar las anotaciones `@PreAuthorize` en los Presenters del backend

### Datos Inconsistentes
- Los tests no hacen rollback entre escenarios
- Si es necesario, ejecutar `DELETE /deleteAll` antes de correr tests

## Mantenimiento

### Agregar Nuevos Tests
1. Agregar escenarios al feature file correspondiente
2. Si se necesitan nuevos steps, agregarlos al archivo de steps apropiado
3. Mantener consistencia con los tags existentes
4. Documentar nuevos comportamientos esperados

### Actualizar Credenciales
Modificar `MT_Helpers.js` → `TEST_USERS`

### Actualizar Endpoints
Modificar `MT_Helpers.js` → `ENDPOINTS`

## Contacto

Para consultas sobre estos tests, revisar la documentación del proyecto:
- `MULTITENANT_IMPLEMENTATION.md` - Backend
- `MULTITENANT_FRONTEND_CHANGES.md` - Frontend
- `CREDENCIALES.md` - Usuarios de prueba
