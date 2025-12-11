# Refactorización Frontend Multi-Tenant - TurneroWeb

## 📋 Resumen Ejecutivo

Este documento detalla los cambios realizados en la aplicación Angular (Frontend) para soportar la arquitectura **multi-tenant**. El objetivo principal fue adaptar la interfaz para que se comporte de manera diferente según si el usuario es un **SUPERADMIN** (visión global) o un **ADMINISTRADOR DE CENTRO** (visión restringida a su tenant), simplificando formularios y automatizando la gestión de contextos.

---

## 🔐 1. Autenticación y Contexto de Usuario

### **UserContextService**
Se actualizó el servicio central de estado del usuario para manejar la identidad del tenant.

- **Detección de Tenant**: Se extrae el `centroAtencionId` del token JWT.
- **Roles Jerárquicos**: Se refinó la lógica para distinguir claramente entre `SUPERADMIN` (sin centro) y `ADMINISTRADOR` (con centro).
- **Propiedades Nuevas**:
  - `userContext.centroAtencionId`: ID del centro asignado (null para SuperAdmin).
  - `userContext.isSuperAdmin`: Helper booleano.
  - `userContext.isTenantAdmin`: Helper booleano.

---

## 🧭 2. Enrutamiento y Seguridad (Guards)

### **CentroAtencionAccessGuard**
Nuevo guard implementado para proteger el acceso a la información de los centros.

- **Lógica de Protección**:
  - **SUPERADMIN**: Acceso total a cualquier ruta `/centrosAtencion/:id`.
  - **ADMINISTRADOR**: 
    - Si intenta acceder a `/centrosAtencion` (lista), es redirigido a `/centrosAtencion/{suId}`.
    - Si intenta acceder a `/centrosAtencion/{otroId}`, es redirigido a su propio centro.
    - Solo puede ver el detalle de SU centro asignado.

### **app.routes.ts**
- Se aplicó el `CentroAtencionAccessGuard` a las rutas de detalle de centros.
- Se configuraron redirecciones inteligentes basadas en el rol.

---

## Navigation 3. Menú Lateral Dinámico (Sidebar)

### **MenuService**
Adaptación dinámica de los items del menú según el contexto del usuario.

- **Item "Centros de Atención"**:
  - **Para SUPERADMIN**: 
    - Label: "Gestión de Centros"
    - Ruta: `/centrosAtencion` (Lista completa)
  - **Para ADMINISTRADOR**:
    - Label: "Mi Centro"
    - Ruta: `/centrosAtencion/{id}` (Detalle directo)
- **Filtrado de Secciones**: Ocultamiento de opciones globales (como gestión de planes o configuraciones del sistema) para administradores de centro.

---

## 🏢 4. Gestión de Centros (Vistas)

### **CentroAtencionDetailRefactoredComponent**
Adaptación del componente de detalle para soportar modos de "Solo Lectura" y "Edición Total".

- **Input `canEdit`**: Nueva propiedad que controla la visualización de acciones destructivas.
- **Comportamiento por Rol**:
  - **SUPERADMIN**: Ve botones "Editar" y "Eliminar". Puede modificar todos los datos.
  - **ADMINISTRADOR**: Ve la información de su centro en modo lectura. No puede eliminar su propio centro ni editar datos críticos (validado también en backend).

---

## 👥 5. Gestión de Recursos (Operadores y Médicos)

### **Operadores (`OperadorDetailComponent`)**
Simplificación drástica del formulario de alta.

- **Eliminación de Selector**: Se quitó el dropdown de "Seleccionar Centro".
- **Servicio (`OperadorService`)**:
  - Nuevo método `createByAdmin` que apunta a `POST /admins/operadores`.
  - El backend infiere el centro automáticamente desde el token del admin.

### **Médicos (`MedicoDetailComponent`)**
Adaptación para manejar médicos como entidades globales asociadas a centros.

- **Eliminación de Selector**: Se quitó el dropdown de "Seleccionar Centro".
- **Servicio (`MedicoService`)**:
  - Método `createByAdmin` apunta a `POST /medicos/create-by-admin`.
  - Nuevo método `getMedicosDisponibles()`: Retorna lista básica (nombre, matrícula) de todos los médicos del sistema para poder asociarlos al staff (sin exponer datos sensibles).
  - Documentación sobre el filtrado automático en `getAll()`: El frontend no filtra, confía en que el backend retorne solo los médicos del staff del admin.

---

## 📊 6. Auditoría y Reportes

### **AuditDashboardComponent**
- **Estado Actual**: Visualización estándar.
- **Limitación Documentada**: Actualmente muestra todos los logs. Se documentó la necesidad futura de un selector de centro para SuperAdmin y filtrado automático para Admin (pendiente de implementación en backend).

### **Notificaciones**
- **Lógica**: Se mantuvo centrada en el Paciente (`pacienteId`). No requiere filtrado por centro ya que las notificaciones siguen al paciente independientemente de dónde se atendió.

---

## 🛠️ Resumen de Servicios Refactorizados

| Servicio | Cambio Principal | Endpoint Backend |
|----------|------------------|------------------|
| `MenuService` | Labels y rutas dinámicas | N/A (Lógica cliente) |
| `OperadorService` | Creación contextual | `/admins/operadores` |
| `MedicoService` | Creación global + Selector básico | `/medicos/create-by-admin`, `/medicos/disponibles` |
| `TurnoService` | Documentación de filtrado | `/turno` (Auto-filtrado por backend) |
| `ConsultorioService` | Documentación de filtrado | `/consultorios` (Auto-filtrado por backend) |
| `StaffMedicoService` | Documentación de filtrado | `/staff-medico` (Auto-filtrado por backend) |

---

## 🚀 Próximos Pasos (Frontend)

1. **Selector de Médicos en Staff**: Implementar el uso de `getMedicosDisponibles()` en la pantalla de gestión de Staff Médico para permitir buscar y asociar médicos existentes.
2. **Migración de Datos**: Ejecutar scripts SQL para asignar `centro_atencion_id` a los usuarios administradores existentes para que la lógica de redirección funcione correctamente.
