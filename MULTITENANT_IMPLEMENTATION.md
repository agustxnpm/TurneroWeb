# Implementación Multi-Tenancy - TurneroWeb

## 📋 Resumen Ejecutivo

Se ha implementado una arquitectura **multi-tenant** completa para TurneroWeb, donde cada centro de atención opera como un tenant aislado. El sistema permite:

- **SUPERADMIN**: Gestión global de centros y administradores
- **ADMINISTRADOR**: Gestión completa de su centro (usuarios, médicos, operadores)
- **OPERADOR/MÉDICO**: Acceso limitado a datos de su centro
- **PACIENTE**: Acceso global para agendar turnos en cualquier centro

---

## 🎯 Arquitectura de Roles y Responsabilidades

### **1. SUPERADMIN (Vendor/Dueño del Sistema)**
**Contexto**: `centroAtencion = null` (acceso global sin restricciones)

**Responsabilidades:**
- ✅ **ABM de Centros de Atención** (`CentroAtencion`)
  - Alta de nuevos centros cuando vendes el producto
  - Modificación de datos de centros
  - Baja/desactivación de centros
- ✅ **Creación de Administradores con centro asignado**
  - `POST /admins` con `centroId` obligatorio
  - Asignación inicial de admin a cada centro nuevo

**Endpoints:**
```
POST /admins              // Crear admin con centroId (SUPERADMIN only)
POST /centros             // ABM de centros de atención
PUT /centros/{id}
DELETE /centros/{id}
```

---

### **2. ADMINISTRADOR (Gestor del Centro)**
**Contexto**: `centroAtencion = {centroId}` (acceso restringido a su centro)

**Responsabilidades:**
- ✅ **Creación de Operadores**
  - `POST /admins/operadores` (auto-asigna su centro)
- ✅ **Creación/Vinculación de Médicos**
  - `POST /medicos` con lógica de reutilización por DNI
  - Si el médico existe: reutiliza + vincula a su centro
  - Si no existe: crea médico + cuenta User + vincula
- ✅ **Gestión de Staff Médico** (`StaffMedico`)
  - Asignación de médicos a especialidades/consultorios
  - Gestión de esquemas de turno
- ✅ **Visualización limitada a su centro**
  - Solo ve pacientes con turnos en su centro
  - Solo ve médicos que trabajan en su centro
  - Solo ve usuarios de su centro

**Endpoints:**
```
POST /admins/operadores   // Crear operador (ADMINISTRADOR only)
POST /medicos             // Crear/vincular médico (ADMINISTRADOR only)
GET /pacientes            // Solo pacientes con turnos en su centro
GET /medicos              // Solo médicos de su centro
GET /usuarios             // Solo usuarios de su centro
```

---

### **3. OPERADOR**
**Contexto**: `centroAtencion = {centroId}` (acceso restringido a su centro)

**Responsabilidades:**
- ✅ Gestión de turnos del centro
- ✅ Visualización de pacientes con turnos en el centro
- ✅ Gestión de agenda médica del centro

---

### **4. MÉDICO**
**Contexto**: `centroAtencion = {centroId}` (acceso restringido a su centro)

**Responsabilidades:**
- ✅ Visualización de sus turnos
- ✅ Acceso solo a pacientes asignados (con turnos con él)
- ✅ Gestión de su disponibilidad

---

### **5. PACIENTE**
**Contexto**: Acceso global (puede agendar en cualquier centro)

**Responsabilidades:**
- ✅ Agendar turnos en cualquier centro
- ✅ Ver sus propios turnos
- ✅ Ver disponibilidad de todos los centros

---

## 🔧 Componentes Implementados

### **1. TenantContext (Core Multi-Tenancy)**

**Ubicación**: `backend/src/main/java/unpsjb/labprog/backend/config/TenantContext.java`

**Función**: Proporciona el contexto de tenant basado en el usuario autenticado.

```java
public static Integer getFilteredCentroId() {
    User currentUser = getCurrentAuthenticatedUser();
    
    // SUPERADMIN y PACIENTE: acceso global
    if (currentUser.getRole() == Role.SUPERADMIN || 
        currentUser.getRole() == Role.PACIENTE) {
        return null;
    }
    
    // ADMINISTRADOR, OPERADOR, MEDICO: filtrado por centro
    return currentUser.getCentroAtencion() != null 
        ? currentUser.getCentroAtencion().getId() 
        : null;
}
```

**Uso en servicios:**
```java
Integer centroId = TenantContext.getFilteredCentroId();

if (centroId != null) {
    // Filtrar por centro
    return repository.findByCentroId(centroId);
} else {
    // Acceso global (SUPERADMIN/PACIENTE)
    return repository.findAll();
}
```

---

### **2. Repositories Multi-Tenant**

#### **PacienteRepository**
**Métodos agregados:**
```java
// Pacientes con turnos en un centro específico
List<Paciente> findPacientesConTurnosEnCentro(Integer centroId);
Page<Paciente> findPacientesConTurnosEnCentro(Integer centroId, Pageable pageable);

// Búsqueda con filtros + centro
Page<Paciente> findByFiltrosAndCentro(String nombre, String dni, String email, 
                                       Integer obraSocialId, Integer centroId, 
                                       Pageable pageable);

// Pacientes de un médico específico
List<Paciente> findPacientesConTurnosDeStaffMedico(Integer staffMedicoId);
Page<Paciente> findPacientesConTurnosDeStaffMedico(Integer staffMedicoId, Pageable pageable);
```

**Lógica**: Usa JOIN con `Turno` → `StaffMedico` → `CentroAtencion` para determinar qué pacientes pertenecen a qué centro (basado en dónde tienen turnos).

---

#### **MedicoRepository**
**Métodos agregados:**
```java
// Médicos que trabajan en un centro (via StaffMedico)
List<Medico> findByCentroAtencionId(Integer centroId);
Page<Medico> findByCentroAtencionId(Integer centroId, Pageable pageable);

// Ya existían:
Optional<Medico> findByDni(Long dni);
boolean existsByDni(Long dni);
```

**Nota**: `Medico` es una entidad **global**, pero el filtrado se hace mediante `StaffMedico` (relación N:M con centros).

---

#### **UserRepository**
**Métodos agregados:**
```java
// Usuarios de un centro específico
List<User> findByCentroAtencion_Id(Integer centroId);
```

---

#### **StaffMedicoRepository**
**Métodos agregados:**
```java
// Verificar si un médico ya trabaja en un centro
boolean existsByMedicoIdAndCentroId(Integer medicoId, Integer centroId);

// Buscar staff médico por DNI
List<StaffMedico> findByMedico_Dni(Long dni);
```

---

### **3. Services Multi-Tenant**

#### **PacienteService**
**Métodos modificados:**
```java
public List<PacienteDTO> findAll() {
    Integer centroId = TenantContext.getFilteredCentroId();
    
    if (centroId != null) {
        User currentUser = TenantContext.getCurrentAuthenticatedUser();
        
        if (currentUser.getRole() == Role.MEDICO) {
            // MEDICO: solo sus pacientes asignados
            StaffMedico staff = staffMedicoRepository.findByMedico_Dni(currentUser.getDni())
                .stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Médico sin staff asignado"));
            return repository.findPacientesConTurnosDeStaffMedico(staff.getId());
        } else {
            // ADMINISTRADOR/OPERADOR: pacientes del centro
            return repository.findPacientesConTurnosEnCentro(centroId);
        }
    } else {
        // SUPERADMIN/PACIENTE: todos los pacientes
        return repository.findAll();
    }
}

// También adaptados: findByPage(), findByPage(filtros)
```

---

#### **UserService**
**Métodos agregados:**
```java
// Creación de admin con centro obligatorio (SUPERADMIN)
public RegisterSuccessResponse createAdmin(RegisterRequest dto, String performedBy) {
    if (dto.getCentroId() == null) {
        throw new IllegalArgumentException("El centroId es obligatorio");
    }
    // ... crea admin con centroAtencion asignado
}

// Creación de operador en el centro del admin (ADMINISTRADOR)
public RegisterSuccessResponse createOperador(RegisterRequest dto, String performedByEmail) {
    User performingAdmin = userRepository.findByEmail(performedByEmail)...;
    
    // Asignar mismo centro que el admin
    operador.setCentroAtencion(performingAdmin.getCentroAtencion());
    // ...
}
```

**Método modificado:**
```java
public List<User> findAll() {
    Integer centroId = TenantContext.getFilteredCentroId();
    
    if (centroId != null) {
        // Usuarios del centro
        return userRepository.findByCentroAtencion_Id(centroId);
    } else {
        // Todos los usuarios (SUPERADMIN)
        return userRepository.findAll();
    }
}
```

---

#### **MedicoService**
**Método nuevo clave:**
```java
@Transactional
public MedicoDTO createMedico(MedicoDTO dto, String performedByEmail) {
    // 1. Obtener centro del ADMINISTRADOR
    User admin = userService.findByEmail(performedByEmail)...;
    Integer centroId = admin.getCentroAtencion().getId();
    
    // 2. Validar DNI: ¿Médico ya existe?
    Optional<Medico> existing = repository.findByDni(dniLong);
    
    if (existing.isPresent()) {
        // REUTILIZAR médico existente
        medico = existing.get();
        
        // Validar que no esté ya en este centro
        if (staffMedicoRepository.existsByMedicoIdAndCentroId(medico.getId(), centroId)) {
            throw new IllegalArgumentException("Ya asignado a su centro");
        }
    } else {
        // CREAR nuevo médico
        medico = repository.save(toEntity(dto));
        
        // Crear cuenta User
        registrationService.registrarMedicoWithAudit(...);
        
        // Enviar email con credenciales
        emailService.sendMedicoWelcomeEmail(medicoUser, temporaryPassword);
    }
    
    // 3. SIEMPRE crear StaffMedico vinculando al centro
    StaffMedico staff = new StaffMedico();
    staff.setMedico(medico);
    staff.setCentroAtencion(centro);
    staff.setEspecialidad(especialidad);
    staffMedicoRepository.save(staff);
    
    return toDTO(medico);
}
```

**Ventajas:**
- ✅ Sin duplicados: 1 médico que trabaja en 2 centros = 1 `Medico` + 2 `StaffMedico`
- ✅ No duplica cuenta User
- ✅ Portabilidad: médico mantiene credenciales entre centros
- ✅ Autonomía: ADMINISTRADOR no depende de SUPERADMIN

**Métodos modificados:**
```java
public List<MedicoDTO> findAll() {
    Integer centroId = TenantContext.getFilteredCentroId();
    
    if (centroId != null) {
        return repository.findByCentroAtencionId(centroId);
    } else {
        return repository.findAll();
    }
}

// También adaptados: findByPage(), findByPage(filtros)
```

---

#### **CentroAtencionService**
**Métodos modificados:**
```java
public List<CentroAtencionDTO> findAll() {
    Integer centroId = TenantContext.getFilteredCentroId();
    
    if (centroId != null) {
        // ADMINISTRADOR/OPERADOR/MEDICO: solo su centro
        return repository.findById(centroId)
            .map(centro -> List.of(toDTO(centro)))
            .orElse(List.of());
    } else {
        // SUPERADMIN/PACIENTE: todos los centros
        return repository.findAll();
    }
}

// También adaptados: findByPage(), search()
```

---

### **4. Presenters (Endpoints)**

#### **AdminPresenter**
**Endpoints modificados/agregados:**
```java
// Crear admin (solo SUPERADMIN)
@PostMapping
@PreAuthorize("hasRole('SUPERADMIN')")
public ResponseEntity<Object> create(@RequestBody RegisterRequest dto) {
    // Requiere centroId en dto
    RegisterSuccessResponse newAdmin = userService.createAdmin(dto, performedBy);
    return Response.ok(newAdmin, "Administrador creado exitosamente");
}

// Crear operador (solo ADMINISTRADOR)
@PostMapping("/operadores")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public ResponseEntity<Object> createOperador(@RequestBody RegisterRequest dto) {
    // Auto-asigna centro del admin
    RegisterSuccessResponse newOperador = userService.createOperador(dto, performedBy);
    return Response.ok(newOperador, "Operador creado exitosamente");
}
```

---

#### **MedicoPresenter**
**Endpoints modificados:**
```java
// Crear médico (solo ADMINISTRADOR)
@PostMapping
@PreAuthorize("hasRole('ADMINISTRADOR')")
public ResponseEntity<Object> create(@RequestBody MedicoDTO medicoDTO) {
    // Usa createMedico con lógica de reutilización
    MedicoDTO created = service.createMedico(medicoDTO, performedBy);
    return Response.ok(created, "Médico creado/vinculado exitosamente");
}
```

---

### **5. Email Service**

**Método agregado:**
```java
@Async
public CompletableFuture<Void> sendMedicoWelcomeEmail(User medicoUser, String temporaryPassword) {
    String subject = appName + " - Bienvenido Dr./Dra. " + medicoUser.getApellido();
    String htmlBody = buildMedicoWelcomeEmailBody(...);
    return sendHtmlEmailAsync(medicoUser.getEmail(), subject, htmlBody);
}
```

**Características de la plantilla:**
- 🏥 Título profesional: "Dr./Dra. [Apellido]"
- 💼 Contenido formal para personal médico
- ✅ Lista de funcionalidades del sistema
- 🔒 Mención de normativas de protección de datos médicos
- 🎨 Botón verde (vs azul de admins)

---

### **6. AdminInitializer (Bootstrap)**

**Modificación**: Crea SUPERADMIN en lugar de ADMINISTRADOR

```java
@Component
public class AdminInitializer implements CommandLineRunner {
    
    @Value("${admin.default.email:superadmin@turneroweb.com}")
    private String defaultEmail;
    
    @Value("${admin.default.password:SuperAdmin2025}")
    private String defaultPassword;
    
    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail(defaultEmail)) {
            User superadmin = new User();
            superadmin.setRole(Role.SUPERADMIN);
            superadmin.setCentroAtencion(null); // Acceso global
            superadmin.setEmailVerified(true);
            // ... crear superadmin
            
            logger.info("✅ SUPERADMIN creado: {} - GLOBAL (sin restricciones)", defaultEmail);
        }
    }
}
```

**Credenciales iniciales:**
- Email: `superadmin@turneroweb.com`
- Password: `SuperAdmin2025`
- DNI: `11111111`

---

## 📊 Flujo de Datos Multi-Tenant

### **Escenario: ADMINISTRADOR crea un médico**

```
1. Frontend → POST /medicos
   {
     "nombre": "Juan",
     "apellido": "Pérez", 
     "dni": "12345678",
     "email": "jperez@example.com",
     "matricula": "MP123",
     "especialidadIds": [1]
   }

2. MedicoPresenter (@PreAuthorize ADMINISTRADOR)
   ↓
3. AuditContext.getCurrentUser() → "admin@centro1.com"
   ↓
4. MedicoService.createMedico(dto, "admin@centro1.com")
   ↓
5. UserService.findByEmail("admin@centro1.com")
   → User{centroAtencion: {id: 1, nombre: "Centro 1"}}
   ↓
6. MedicoRepository.findByDni(12345678)
   
   CASO A: No existe
   → Crear Medico
   → Crear User (Role.MEDICO)
   → Enviar email con credenciales
   
   CASO B: Existe (trabaja en otro centro)
   → Reutilizar Medico existente
   → NO crear User (ya tiene)
   → NO enviar email
   ↓
7. StaffMedicoRepository.save(
     StaffMedico{
       medico: medico,
       centro: Centro 1,
       especialidad: especialidadId
     }
   )
   ↓
8. AuditLogService.logGenericAction(
     "Médico creado/vinculado al centro Centro 1"
   )
```

---

### **Escenario: OPERADOR consulta pacientes**

```
1. Frontend → GET /pacientes

2. PacientePresenter.findAll()
   ↓
3. PacienteService.findAll()
   ↓
4. TenantContext.getFilteredCentroId()
   → getCurrentAuthenticatedUser() = User{role: OPERADOR, centroAtencion: {id: 2}}
   → return 2
   ↓
5. PacienteRepository.findPacientesConTurnosEnCentro(2)
   
   SQL:
   SELECT DISTINCT p.* 
   FROM paciente p
   JOIN turno t ON t.paciente_id = p.id
   JOIN staff_medico sm ON sm.id = t.staff_medico_id
   WHERE sm.centro_atencion_id = 2
   ↓
6. Return: Solo pacientes con turnos en Centro 2
```

---

### **Escenario: MÉDICO consulta pacientes**

```
1. Frontend → GET /pacientes

2. PacienteService.findAll()
   ↓
3. TenantContext.getFilteredCentroId()
   → getCurrentAuthenticatedUser() = User{role: MEDICO, dni: 98765432, centroAtencion: {id: 3}}
   → return 3
   ↓
4. StaffMedicoRepository.findByMedico_Dni(98765432)
   → StaffMedico{id: 10, ...}
   ↓
5. PacienteRepository.findPacientesConTurnosDeStaffMedico(10)
   
   SQL:
   SELECT DISTINCT p.*
   FROM paciente p
   JOIN turno t ON t.paciente_id = p.id
   WHERE t.staff_medico_id = 10
   ↓
6. Return: Solo pacientes con turnos asignados a este médico
```

---

## ✅ Checklist de Implementación Completada

### **Backend - Core Multi-Tenancy**
- [x] `TenantContext` con `getFilteredCentroId()`
- [x] `AdminInitializer` crea SUPERADMIN con `centroAtencion = null`
- [x] Roles definidos: SUPERADMIN, ADMINISTRADOR, OPERADOR, MEDICO, PACIENTE

### **Backend - Repositories**
- [x] `PacienteRepository`: 5 métodos multi-tenant agregados
- [x] `MedicoRepository`: Métodos de filtrado por centro
- [x] `UserRepository`: `findByCentroAtencion_Id()`
- [x] `StaffMedicoRepository`: `existsByMedicoIdAndCentroId()`

### **Backend - Services**
- [x] `PacienteService`: 3 métodos adaptados (findAll, findByPage x2)
- [x] `UserService`: createAdmin(), createOperador(), findAll() adaptado
- [x] `MedicoService`: createMedico() con reutilización de médicos
- [x] `CentroAtencionService`: 3 métodos adaptados (findAll, findByPage, search)
- [x] `EmailService`: sendMedicoWelcomeEmail() agregado

### **Backend - Presenters**
- [x] `AdminPresenter`: 
  - POST /admins (@PreAuthorize SUPERADMIN)
  - POST /admins/operadores (@PreAuthorize ADMINISTRADOR)
- [x] `MedicoPresenter`: POST /medicos (@PreAuthorize ADMINISTRADOR)

### **Backend - DTOs**
- [x] `RegisterRequest`: campo `centroId` agregado
- [x] `AssignCentroRequest`: creado (userId, centroId)

---

## ⚠️ Tareas Pendientes

### **1. Frontend - Actualización de Formularios**

#### **Formulario de creación de Admin (SUPERADMIN)**
**Archivo**: `frontend/cli/src/app/admin/admin-form.component.ts`

```typescript
// Agregar campo centroId
export class AdminFormComponent {
  centros: CentroAtencion[] = [];
  
  ngOnInit() {
    // Cargar centros disponibles
    this.centroService.getAll().subscribe(centros => {
      this.centros = centros;
    });
  }
  
  onSubmit() {
    const payload = {
      ...this.form.value,
      centroId: this.form.value.centroId // ← REQUERIDO
    };
    
    this.adminService.create(payload).subscribe(...);
  }
}
```

**Template HTML**:
```html
<div class="form-group">
  <label for="centroId">Centro de Atención *</label>
  <select id="centroId" formControlName="centroId" required>
    <option value="">Seleccione un centro</option>
    <option *ngFor="let centro of centros" [value]="centro.id">
      {{ centro.nombre }}
    </option>
  </select>
</div>
```

---

#### **Formulario de creación de Médico (ADMINISTRADOR)**
**Archivo**: `frontend/cli/src/app/medico/medico-form.component.ts`

```typescript
// NO necesita campo centroId (se asigna automáticamente en backend)
// SÍ necesita especialidadId

onSubmit() {
  const payload = {
    ...this.form.value,
    especialidadIds: [this.form.value.especialidadId] // Array con 1 especialidad
  };
  
  this.medicoService.create(payload).subscribe(
    response => {
      // Mostrar mensaje: "Médico creado/vinculado exitosamente"
      if (response.status_text.includes('vinculado')) {
        this.showInfo('Este médico ya existía y fue vinculado a su centro');
      }
    }
  );
}
```

---

### **2. Frontend - Guardias de Navegación**

#### **Restricción de rutas por rol**
**Archivo**: `frontend/cli/src/app/guards/role.guard.ts`

```typescript
@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as Role[];
    const currentUser = this.authService.getCurrentUser();
    
    return requiredRoles.includes(currentUser.role);
  }
}
```

**Configuración de rutas**:
```typescript
const routes: Routes = [
  {
    path: 'centros',
    component: CentroListComponent,
    canActivate: [RoleGuard],
    data: { roles: [Role.SUPERADMIN, Role.PACIENTE] }
  },
  {
    path: 'admins/create',
    component: AdminFormComponent,
    canActivate: [RoleGuard],
    data: { roles: [Role.SUPERADMIN] }
  },
  {
    path: 'operadores/create',
    component: OperadorFormComponent,
    canActivate: [RoleGuard],
    data: { roles: [Role.ADMINISTRADOR] }
  },
  {
    path: 'medicos/create',
    component: MedicoFormComponent,
    canActivate: [RoleGuard],
    data: { roles: [Role.ADMINISTRADOR] }
  }
];
```

---

### **3. Frontend - Menú Dinámico por Rol**

**Archivo**: `frontend/cli/src/app/layout/navbar.component.ts`

```typescript
export class NavbarComponent {
  menuItems: MenuItem[] = [];
  
  ngOnInit() {
    const role = this.authService.getCurrentUser().role;
    
    switch(role) {
      case Role.SUPERADMIN:
        this.menuItems = [
          { label: 'Centros', route: '/centros', icon: 'hospital' },
          { label: 'Administradores', route: '/admins', icon: 'user-shield' },
          { label: 'Dashboard', route: '/dashboard', icon: 'chart-bar' }
        ];
        break;
        
      case Role.ADMINISTRADOR:
        this.menuItems = [
          { label: 'Mi Centro', route: '/mi-centro', icon: 'hospital' },
          { label: 'Médicos', route: '/medicos', icon: 'user-md' },
          { label: 'Operadores', route: '/operadores', icon: 'users' },
          { label: 'Staff', route: '/staff', icon: 'id-card' },
          { label: 'Turnos', route: '/turnos', icon: 'calendar' },
          { label: 'Pacientes', route: '/pacientes', icon: 'user-injured' }
        ];
        break;
        
      case Role.OPERADOR:
        this.menuItems = [
          { label: 'Turnos', route: '/turnos', icon: 'calendar' },
          { label: 'Pacientes', route: '/pacientes', icon: 'user-injured' },
          { label: 'Agenda', route: '/agenda', icon: 'calendar-alt' }
        ];
        break;
        
      case Role.MEDICO:
        this.menuItems = [
          { label: 'Mis Turnos', route: '/mis-turnos', icon: 'calendar-check' },
          { label: 'Mis Pacientes', route: '/mis-pacientes', icon: 'user-injured' },
          { label: 'Mi Disponibilidad', route: '/disponibilidad', icon: 'clock' }
        ];
        break;
        
      case Role.PACIENTE:
        this.menuItems = [
          { label: 'Agendar Turno', route: '/agendar', icon: 'calendar-plus' },
          { label: 'Mis Turnos', route: '/mis-turnos', icon: 'list' },
          { label: 'Centros', route: '/centros', icon: 'hospital' }
        ];
        break;
    }
  }
}
```

---

### **4. Testing - Casos de Prueba Multi-Tenant**

#### **Test 1: SUPERADMIN crea admin**
```cucumber
Feature: SUPERADMIN crea administrador con centro

Scenario: Crear admin sin centroId
  Given estoy autenticado como SUPERADMIN
  When envío POST /admins sin centroId
  Then recibo error "El centroId es obligatorio"

Scenario: Crear admin con centroId válido
  Given estoy autenticado como SUPERADMIN
  And existe un centro con id=1
  When envío POST /admins con centroId=1
  Then recibo status 200
  And el admin tiene centroAtencion.id = 1
```

---

#### **Test 2: ADMINISTRADOR crea médico nuevo**
```cucumber
Feature: ADMINISTRADOR crea médico

Scenario: Crear médico que no existe
  Given estoy autenticado como ADMINISTRADOR del centro 2
  When envío POST /medicos con DNI "12345678"
  Then se crea entidad Medico
  And se crea User con role MEDICO
  And se envía email con credenciales
  And se crea StaffMedico vinculando al centro 2
  And recibo mensaje "Médico creado y vinculado exitosamente"
```

---

#### **Test 3: ADMINISTRADOR vincula médico existente**
```cucumber
Feature: ADMINISTRADOR vincula médico existente

Background:
  Given existe médico con DNI "12345678" trabajando en centro 1

Scenario: Vincular médico a otro centro
  Given estoy autenticado como ADMINISTRADOR del centro 2
  When envío POST /medicos con DNI "12345678"
  Then NO se crea nueva entidad Medico
  And NO se crea nuevo User
  And NO se envía email
  And se crea StaffMedico vinculando al centro 2
  And recibo mensaje "Médico existente vinculado exitosamente"
```

---

#### **Test 4: Aislamiento de datos por centro**
```cucumber
Feature: Filtrado multi-tenant de pacientes

Scenario: OPERADOR solo ve pacientes de su centro
  Given existen pacientes:
    | DNI       | Turnos en Centro |
    | 11111111  | Centro 1         |
    | 22222222  | Centro 2         |
    | 33333333  | Centro 1, 2      |
  And estoy autenticado como OPERADOR del Centro 1
  When envío GET /pacientes
  Then recibo pacientes con DNI [11111111, 33333333]
  And NO recibo paciente con DNI 22222222
```

---

### **5. Base de Datos - Migraciones**

#### **Verificar constraints y índices**
```sql
-- Verificar que centroAtencion_id existe en User
ALTER TABLE users 
ADD CONSTRAINT fk_user_centro 
FOREIGN KEY (centro_atencion_id) 
REFERENCES centro_atencion(id);

-- Índice para mejorar performance de queries multi-tenant
CREATE INDEX idx_user_centro ON users(centro_atencion_id);
CREATE INDEX idx_staff_medico_centro ON staff_medico(centro_atencion_id);
CREATE INDEX idx_turno_staff ON turno(staff_medico_id);
```

---

### **6. Documentación - README**

**Agregar sección Multi-Tenancy en README.md**:

```markdown
## 🏢 Multi-Tenancy

TurneroWeb implementa arquitectura multi-tenant donde cada centro de atención opera como un tenant aislado.

### Roles y Acceso

| Rol | Acceso | Responsabilidades |
|-----|--------|-------------------|
| SUPERADMIN | Global | ABM centros, crear admins |
| ADMINISTRADOR | Su centro | Gestionar médicos, operadores, staff |
| OPERADOR | Su centro | Gestionar turnos, pacientes |
| MÉDICO | Su centro | Ver sus turnos y pacientes |
| PACIENTE | Global | Agendar en cualquier centro |

### Credenciales Iniciales

**SUPERADMIN** (primer acceso):
- Email: `superadmin@turneroweb.com`
- Password: `SuperAdmin2025`
- DNI: `11111111`

### Flujo de Onboarding

1. **SUPERADMIN** crea un nuevo centro de atención
2. **SUPERADMIN** crea un administrador y lo asigna al centro
3. **ADMINISTRADOR** recibe email con credenciales
4. **ADMINISTRADOR** crea médicos (nuevos o vincula existentes)
5. **ADMINISTRADOR** crea operadores para su centro
6. Personal recibe emails con credenciales y accede al sistema
```

---

### **7. Configuración - Variables de Entorno**

**Archivo**: `backend/src/main/resources/application.properties`

```properties
# SUPERADMIN Bootstrap Configuration
admin.default.email=superadmin@turneroweb.com
admin.default.password=SuperAdmin2025
admin.default.nombre=Super
admin.default.apellido=Administrador
admin.default.dni=11111111

# Multi-Tenancy Configuration
app.tenant.isolation.enabled=true
app.tenant.default.access=centro-restricted
```

---

### **8. Auditoría - Logs Multi-Tenant**

**Verificar que AuditLog registre**:
- Creación de admins con centroId
- Creación/vinculación de médicos
- Creación de StaffMedico
- Acciones diferenciando "creado" vs "vinculado"

**Consulta SQL para auditar**:
```sql
SELECT 
  al.action,
  al.performed_by,
  al.additional_info,
  al.timestamp
FROM audit_log al
WHERE al.entity_type = 'STAFF_MEDICO'
  AND al.action = 'CREATE'
ORDER BY al.timestamp DESC
LIMIT 50;
```

---

## 🚀 Próximos Pasos Recomendados

### **Prioridad Alta**
1. ✅ Actualizar formulario de creación de admin (agregar selector de centro)
2. ✅ Implementar guardias de navegación por rol
3. ✅ Configurar menú dinámico según rol

### **Prioridad Media**
4. ✅ Crear tests Cucumber para flujos multi-tenant
5. ✅ Verificar migraciones y constraints en BD
6. ✅ Actualizar README con documentación multi-tenant

### **Prioridad Baja**
7. ⚠️ Implementar panel de métricas por centro para ADMINISTRADOR
8. ⚠️ Agregar exportación de datos filtrados por centro
9. ⚠️ Implementar sistema de notificaciones por centro

---

## 📌 Notas Importantes

### **Médicos Multi-Centro**
Un médico puede trabajar en **múltiples centros** con **diferentes especialidades** en cada uno:

```
Medico (Global)
├─ id: 1, dni: 12345678, nombre: "Juan Pérez"
│
StaffMedico (Centro 1)
├─ medico_id: 1, centro_id: 1, especialidad: Cardiología
│
StaffMedico (Centro 2)
└─ medico_id: 1, centro_id: 2, especialidad: Medicina General
```

- ✅ 1 cuenta User (email único)
- ✅ 1 registro Medico (DNI único)
- ✅ N registros StaffMedico (1 por centro+especialidad)

---

### **Pacientes - Sin campo centroAtencion**
Los pacientes **NO tienen** campo `centroAtencion` porque:
- Pueden agendar turnos en **múltiples centros**
- La relación con centros se determina mediante `Turno` → `StaffMedico` → `CentroAtencion`

**Filtrado de pacientes**:
```java
// ADMINISTRADOR del Centro 1 ve:
// → Pacientes que tienen al menos 1 turno con médicos del Centro 1

SELECT DISTINCT p.*
FROM paciente p
JOIN turno t ON t.paciente_id = p.id
JOIN staff_medico sm ON sm.id = t.staff_medico_id
WHERE sm.centro_atencion_id = 1
```

---

### **Seguridad - @PreAuthorize**
Todos los endpoints críticos **DEBEN** tener anotación `@PreAuthorize`:

```java
@PreAuthorize("hasRole('SUPERADMIN')")        // Solo SUPERADMIN
@PreAuthorize("hasRole('ADMINISTRADOR')")     // Solo ADMINISTRADOR
@PreAuthorize("hasAnyRole('ADMINISTRADOR', 'OPERADOR')") // Admin o Operador
```

**Sin esta anotación**, cualquier usuario autenticado podría acceder.

---

### **Testing - Importante**
Al probar endpoints multi-tenant, siempre verificar:
1. ✅ Usuario recibe solo datos de su centro
2. ✅ Usuario NO puede ver datos de otros centros
3. ✅ SUPERADMIN ve todos los datos
4. ✅ PACIENTE ve todos los centros (para agendar)

---

## 📚 Referencias de Código

### **Archivos Core Multi-Tenancy**
- `TenantContext.java` - Contexto de tenant basado en usuario autenticado
- `AdminInitializer.java` - Bootstrap SUPERADMIN inicial
- `SecurityConfig.java` - Configuración Spring Security con roles

### **Repositories Multi-Tenant**
- `PacienteRepository.java` - 5 métodos agregados
- `MedicoRepository.java` - Filtrado por centro
- `UserRepository.java` - Búsqueda por centro
- `StaffMedicoRepository.java` - Verificación médico-centro

### **Services Multi-Tenant**
- `PacienteService.java` - findAll(), findByPage() adaptados
- `MedicoService.java` - createMedico() con reutilización
- `UserService.java` - createAdmin(), createOperador()
- `CentroAtencionService.java` - Filtrado por centro

### **Presenters**
- `AdminPresenter.java` - Endpoints SUPERADMIN/ADMINISTRADOR
- `MedicoPresenter.java` - Endpoint creación médicos

### **Email Templates**
- `EmailService.java` - sendMedicoWelcomeEmail()

---

## 🎓 Conceptos Clave

### **Multi-Tenancy vs Multi-Database**
- ❌ NO usamos bases de datos separadas por tenant
- ✅ SÍ usamos **filtrado a nivel de aplicación** con `TenantContext`
- ✅ Todos los datos en 1 BD, separados lógicamente por `centro_atencion_id`

### **Tenant Isolation Levels**
1. **Global Access** (SUPERADMIN, PACIENTE): `centroId = null`
2. **Centro-Restricted** (ADMIN, OPERADOR): `centroId = X`
3. **Staff-Restricted** (MEDICO): Filtrado adicional por `staff_medico_id`

### **Auditoría Multi-Tenant**
Todos los cambios registran:
- ✅ `performed_by` (email del usuario)
- ✅ `additional_info` (incluye nombre del centro)
- ✅ Diferencia entre "creado" y "vinculado" (médicos)

---

**Última actualización**: 9 de diciembre de 2025  
**Versión**: 1.0.0  
**Estado**: Implementación Backend Completa ✅ | Frontend Pendiente ⚠️
