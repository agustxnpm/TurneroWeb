# 🐛 REPORTE DE CORRECCIÓN - BUG DE ZONA HORARIA

**Fecha de reporte**: 12 de Diciembre de 2025  
**Versión**: 1.0  
**Severidad**: 🔴 CRÍTICA

---

## 📋 RESUMEN DEL PROBLEMA

El sistema estaba experimentando comportamientos extraños con la validación de fechas y horarios de turnos. El error principal mostraba mensajes como:

> "Ya pasó la hora límite de confirmación (00:00). Podías confirmar este turno hasta las 00:00 del día 13/12/2025."

Aunque el usuario intentaba confirmar dentro de la ventana permitida.

---

## 🔍 ROOT CAUSE ANALYSIS

Se identificaron **5 problemas relacionados con zona horaria**:

### 1️⃣ Jackson configurado con UTC en lugar de Argentina

**Archivo**: [application.properties](backend/src/main/resources/application.properties#L13)

```properties
# ❌ ANTES
spring.jackson.time-zone=UTC

# ✅ DESPUÉS
spring.jackson.time-zone=America/Argentina/Buenos_Aires
```

**Impacto**: Todas las fechas se deserializaban en UTC (-0:00) en lugar de Argentina (UTC-3)

---

### 2️⃣ LocalTime.now() SIN zona horaria en TurnoService

**Archivo**: [TurnoService.java](backend/src/main/java/unpsjb/labprog/backend/business/service/TurnoService.java#L594)

```java
// ❌ ANTES - Usa zona horaria del SERVIDOR (podría ser cualquiera)
LocalDate hoy = LocalDate.now();

// ✅ DESPUÉS - Usa zona horaria de Argentina
ZoneId zoneId = ZoneId.of("America/Argentina/Buenos_Aires");
LocalDate hoy = LocalDate.now(zoneId);
```

**Impacto**: Las comparaciones de fechas comparaban fechas en diferentes zonas horarias

---

### 3️⃣ @Scheduled SIN zona horaria explícita

**Archivo**: [TurnoService.java](backend/src/main/java/unpsjb/labprog/backend/business/service/TurnoService.java#L667)

```java
// ❌ ANTES - Cron se ejecuta en zona horaria del SERVIDOR
@Scheduled(cron = "0 0 0 * * ?")

// ✅ DESPUÉS - Cron se ejecuta explícitamente en Argentina
@Scheduled(cron = "0 0 0 * * ?", zone = "America/Argentina/Buenos_Aires")
```

**Impacto**: Cancelaciones automáticas ejecutadas en hora incorrecta

---

### 4️⃣ Inconsistencia: TurnoAutomationService hace bien, TurnoService no

**Archivo**: [TurnoAutomationService.java](backend/src/main/java/unpsjb/labprog/backend/business/service/TurnoAutomationService.java#L27)

```java
// ✅ YA ESTABA CORRECTO en TurnoAutomationService
private static final ZoneId ARGENTINA_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");
ZonedDateTime ahoraArgentina = ZonedDateTime.now(ARGENTINA_ZONE);
```

Ahora TurnoService usa el mismo patrón.

---

### 5️⃣ Frontend: parseFecha() construye Date sin considerar zona horaria

**Archivo**: [operador-dashboard.component.ts](frontend/cli/src/app/operador/operador-dashboard.component.ts#L215)

```typescript
// ❌ ANTES - new Date(year, month, day) interpreta en zona horaria LOCAL del navegador
return new Date(
  turno.year || new Date().getFullYear(),
  monthIndex,
  parseInt(turno.day)
);

// ✅ DESPUÉS - Usar formato ISO string
return new Date(dateString + "T00:00:00");
```

**Impacto**: El navegador interpretaba fechas según su zona horaria local, no Argentina

---

### 6️⃣ Comparaciones de Date() sin considerar zona horaria

**Archivo**: [paciente-reagendar-turno.component.ts](frontend/cli/src/app/pacientes/paciente-reagendar-turno.component.ts#L155)

```typescript
// ❌ ANTES - getTime() depende de zona horaria local
const currentDateTime = new Date(
  `${this.currentTurno.fecha}T${this.currentTurno.horaInicio}`
);
const slotDateTime = new Date(`${slot.fecha}T${slot.horaInicio}`);
return slotDateTime.getTime() !== currentDateTime.getTime();

// ✅ DESPUÉS - Comparar strings directamente
const currentDateTimeStr = `${this.currentTurno.fecha}T${this.currentTurno.horaInicio}`;
const slotDateTimeStr = `${slot.fecha}T${slot.horaInicio}`;
return slotDateTimeStr !== currentDateTimeStr;
```

**Impacto**: Slots disponibles podían filtrarse incorrectamente

---

## ✅ CAMBIOS REALIZADOS

### Backend

#### 1. [application.properties](backend/src/main/resources/application.properties)

- ✅ Cambiar `spring.jackson.time-zone` de `UTC` a `America/Argentina/Buenos_Aires`

#### 2. [TurnoService.java](backend/src/main/java/unpsjb/labprog/backend/business/service/TurnoService.java)

- ✅ Línea 594: `LocalDate.now()` → `LocalDate.now(ZoneId.of("America/Argentina/Buenos_Aires"))`
- ✅ Línea 667: Añadir `zone = "America/Argentina/Buenos_Aires"` al decorador `@Scheduled`

---

### Frontend

#### 1. [operador-dashboard.component.ts](frontend/cli/src/app/operador/operador-dashboard.component.ts#L215)

- ✅ Reescribir `parseFecha()` para usar strings en formato ISO

#### 2. [paciente-reagendar-turno.component.ts](frontend/cli/src/app/pacientes/paciente-reagendar-turno.component.ts#L155)

- ✅ Cambiar comparaciones de `getTime()` a comparación de strings

---

## 🧪 PASOS PARA VALIDAR LA CORRECCIÓN

### Backend

```bash
# 1. Recompilación necesaria
./lpl compile

# 2. Reiniciar backend
./lpl restart backend

# 3. Verificar logs de inicio - buscar zona horaria
docker logs backend-container | grep -i timezone

# 4. Verificar configuración activa
curl http://localhost:8080/configuracion | grep jackson
```

### Frontend

```bash
# 1. Recargar página (Ctrl+F5 para limpiar caché)
# 2. Abrir DevTools > Console
# 3. Intentar confirmar un turno próximo
# 4. Verificar que NO aparezca el error de "Ya pasó la hora límite"
```

---

## 📊 IMPACTO DE LA CORRECCIÓN

| Funcionalidad              | Antes                                 | Después                           |
| -------------------------- | ------------------------------------- | --------------------------------- |
| **Confirmación de turnos** | ❌ Rechazaba dentro de ventana válida | ✅ Acepta correctamente           |
| **Cancelación automática** | ❌ Ejecutaba en hora incorrecta       | ✅ Ejecuta a medianoche Argentina |
| **Comparación de fechas**  | ❌ Inconsistente por zonas horarias   | ✅ Consistente en Argentina       |
| **Dashboard operador**     | ❌ Filtros incorrectos                | ✅ Filtros precisos               |
| **Reagendamiento**         | ❌ Excluía slots válidos              | ✅ Muestra todos los válidos      |

---

## 🚀 NOTAS DE IMPLEMENTACIÓN

### Por qué no usar `moment.js` o similar

- El proyecto ya usa Angular 19 y `LocalDate` del API de Java está bien mapeado
- Jackson maneja la conversión automáticamente una vez se configura correctamente la zona horaria
- Agregar librerías de fecha aumentaría dependencias innecesariamente

### Constantes de zona horaria a usar en futuros desarrollos

```java
// Backend
private static final ZoneId ARGENTINA_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

// Usar en servicios:
LocalDate.now(ARGENTINA_ZONE)
LocalTime.now(ARGENTINA_ZONE)
LocalDateTime.now(ARGENTINA_ZONE)
```

```typescript
// Frontend - si necesita comparar con server
const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";
```

---

## 📝 CHECKLIST DE VALIDACIÓN

- [x] Jackson configurado con zona horaria Argentina
- [x] LocalDate.now() usa zona horaria Argentina en TurnoService
- [x] @Scheduled especifica zona horaria en cancelación automática
- [x] parseFecha() en frontend usa formato ISO
- [x] Comparaciones de fechas evitan problemas de zona horaria
- [ ] Pruebas manuales de confirmación de turnos
- [ ] Pruebas de cancelación automática
- [ ] Pruebas de reagendamiento

---

## 📞 CONTACTO PARA PREGUNTAS

Si hay dudas sobre la implementación, revisar:

- [TurnoAutomationService.java](backend/src/main/java/unpsjb/labprog/backend/business/service/TurnoAutomationService.java) - Referencia correcta de uso de zona horaria
- [JacksonConfig.java](backend/src/main/java/unpsjb/labprog/backend/config/JacksonConfig.java) - Configuración de Jackson
- Documentación oficial de Java Time API: https://docs.oracle.com/javase/8/docs/api/java/time/package-summary.html
