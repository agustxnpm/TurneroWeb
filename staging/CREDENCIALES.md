# 🔐 Credenciales de Acceso - TurneroWeb Multi-Tenant

## Credenciales por Rol

> **Nota:** Todas las contraseñas son: `password`

---

## 👤 SUPERADMIN (Acceso Global)

| Email | Password | Nombre Completo | Centro Asignado |
|-------|----------|-----------------|-----------------|
| superadmin@turnero.com | password | Super Administrador | *(acceso a todos)* |

---

## 🏥 ADMINISTRADORES DE CENTRO

| Email | Password | Nombre Completo | Centro Asignado | Centro ID |
|-------|----------|-----------------|-----------------|-----------|
| admin.santamaria@turnero.com | password | Carlos Rodríguez | Clínica Santa María | 1 |
| admin.delsur@turnero.com | password | Laura Fernández | Clínica del Sur | 2 |
| admin.delsol@turnero.com | password | Roberto Sánchez | Consultorios del Sol | 3 |

---

## 💼 OPERADORES

### Clínica Santa María (Centro ID: 1)

| Email | Password | Nombre Completo | DNI |
|-------|----------|-----------------|-----|
| operador1.santamaria@turnero.com | password | Ana Martínez | 22222221 |
| operador2.santamaria@turnero.com | password | Pedro López | 22222222 |

### Clínica del Sur (Centro ID: 2)

| Email | Password | Nombre Completo | DNI |
|-------|----------|-----------------|-----|
| operador1.delsur@turnero.com | password | Marta Gómez | 22222223 |
| operador2.delsur@turnero.com | password | Jorge Díaz | 22222224 |

### Consultorios del Sol (Centro ID: 3)

| Email | Password | Nombre Completo | DNI |
|-------|----------|-----------------|-----|
| operador1.delsol@turnero.com | password | Silvia Torres | 22222225 |
| operador2.delsol@turnero.com | password | Miguel Castro | 22222226 |

---

## 👨‍⚕️ MÉDICOS (Global)

| Email | Password | Nombre Completo | DNI | Matrícula | Especialidad | Centros Asociados |
|-------|----------|-----------------|-----|-----------|--------------|-------------------|
| medico@turnero.com | password | Dr. Juan Pérez | 33333333 | MP-12345 | Cardiología | *Trabaja en los 3 centros* |

---

## 🧑‍🤝‍🧑 PACIENTES

### Asociados a Clínica Santa María

| Email | Password | Nombre Completo | DNI | Fecha Nacimiento | Obra Social |
|-------|----------|-----------------|-----|------------------|-------------|
| paciente1.santamaria@turnero.com | password | María González | 44444441 | 15/03/1985 | OSDE |
| paciente2.santamaria@turnero.com | password | José Ramírez | 44444442 | 22/07/1990 | OSDE |

### Asociados a Clínica del Sur

| Email | Password | Nombre Completo | DNI | Fecha Nacimiento | Obra Social |
|-------|----------|-----------------|-----|------------------|-------------|
| paciente1.delsur@turnero.com | password | Lucía Morales | 44444443 | 30/11/1988 | Swiss Medical |
| paciente2.delsur@turnero.com | password | Fernando Silva | 44444444 | 18/05/1992 | Swiss Medical |

### Asociados a Consultorios del Sol

| Email | Password | Nombre Completo | DNI | Fecha Nacimiento | Obra Social |
|-------|----------|-----------------|-----|------------------|-------------|
| paciente1.delsol@turnero.com | password | Sofía Vargas | 44444445 | 12/01/1995 | Galeno |
| paciente2.delsol@turnero.com | password | Diego Ortiz | 44444446 | 25/09/1987 | Galeno |

### Pacientes Globales

| Email | Password | Nombre Completo | DNI | Fecha Nacimiento | Obra Social |
|-------|----------|-----------------|-----|------------------|-------------|
| aguspalqui@hotmail.com | password | Agustín Palma | 43808170 | 15/05/2002 | OSDE |

---

## 📊 Resumen de Estructura

### Centros de Atención

| ID | Nombre | Dirección | Localidad | Teléfono |
|----|--------|-----------|-----------|----------|
| 1 | Clínica Santa María | Av. San Martín 123 | Trelew, Chubut | +5492804501111 |
| 2 | Clínica del Sur | Calle Belgrano 456 | Trelew, Chubut | +5492804502222 |
| 3 | Consultorios del Sol | Av. Fontana 789 | Trelew, Chubut | +5492804503333 |

### Obras Sociales

| ID | Nombre | Código |
|----|--------|--------|
| 1 | OSDE | OSDE001 |
| 2 | Swiss Medical | SWISS001 |
| 3 | Galeno | GALENO001 |

### Especialidades

| ID | Nombre |
|----|--------|
| 1 | Cardiología |
| 2 | Pediatría |
| 3 | Traumatología |

---

## 🔍 Guía Rápida de Pruebas

### Escenarios de Prueba Recomendados:

1. **Login como SUPERADMIN**
   - Email: `superadmin@turnero.com`
   - Verificar acceso a todos los centros
   - Probar gestión global de centros

2. **Login como ADMINISTRADOR**
   - Email: `admin.santamaria@turnero.com`
   - Verificar acceso solo a Clínica Santa María (ID: 1)
   - Probar gestión de operadores y consultorios

3. **Login como OPERADOR**
   - Email: `operador1.santamaria@turnero.com`
   - Verificar gestión de turnos para Clínica Santa María
   - Probar asignación de turnos con Dr. Juan Pérez

4. **Login como MÉDICO**
   - Email: `medico@turnero.com`
   - Verificar visibilidad de turnos en los 3 centros
   - Probar acceso a agenda en múltiples clínicas

5. **Login como PACIENTE**
   - Email: `aguspalqui@hotmail.com`
   - Verificar solicitud de turnos en cualquier centro
   - Probar acceso a historial de turnos

---

## 📝 Notas Importantes

- **Centro NULL**: SUPERADMIN, MÉDICO y PACIENTE no tienen centro asignado (`centro_atencion_id = NULL`)
- **Centro Específico**: ADMINISTRADOR y OPERADOR tienen `centro_atencion_id` asignado
- **StaffMedico**: Dr. Juan Pérez está asociado a los 3 centros via tabla `staff_medico`
- **Consultorios**: Cada centro tiene 4 consultorios (numerados 1-4)
- **Hash Password**: `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi` (BCrypt de "password")

---

*Generado desde: `staging/userinit.sql`*
*Fecha: 11 de diciembre de 2025*
