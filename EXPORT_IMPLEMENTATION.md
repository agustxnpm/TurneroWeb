# Implementación de Exportación CSV y PDF - Dashboard de Gestión

## 📋 Descripción General

Se ha implementado exitosamente la funcionalidad de exportación de datos a CSV y PDF en el `DashboardGestionComponent`. Los botones de exportación llaman a los endpoints del `ExportPresenter` del backend.

---

## 🔧 Cambios Realizados

### 1. **Nuevo Servicio: `export.service.ts`**
📁 **Ubicación:** `/frontend/cli/src/app/services/export.service.ts`

**Funcionalidades:**
- `exportarTurnosCSV(filter)` - Llama al endpoint `/rest/export/turnos/csv`
- `exportarTurnosPDF(filter)` - Llama al endpoint `/rest/export/turnos/pdf`
- `exportarTurnosHTML(filter)` - Llama al endpoint `/rest/export/turnos/html`
- `obtenerEstadisticasExportacion(filter)` - Llama al endpoint `/rest/export/turnos/statistics`
- `descargarCSV(content, filename)` - Descarga un archivo CSV desde contenido string
- `descargarPDF(htmlContent, filename)` - Convierte HTML a PDF usando `html2canvas` y `jsPDF` y descarga

**Dependencias utilizadas:**
- `jsPDF` v3.0.3 (para generar PDFs)
- `html2canvas` v1.4.1 (para convertir HTML a canvas)
- Angular HttpClient
- RxJS Observables

### 2. **Componente: `DashboardGestionComponent`**
📁 **Ubicación:** `/frontend/cli/src/app/dashboard-gestion/dashboard-gestion.component.ts`

**Cambios:**
- Importado `ExportService`
- Inyectado en el constructor
- Método `exportarCSV()` - Llama al servicio y descarga CSV
- Método `exportarPDF()` - Llama al servicio y descarga PDF
- Método privado `construirFiltroExportacion()` - Construye el objeto de filtro

**Comportamiento:**
- Los botones se deshabilitan durante la carga (`[disabled]="loading"`)
- Se muestran alertas de error si algo falla
- Los archivos se descargan automáticamente con nombre formateado: `turnos_YYYY-MM-DD.csv|pdf`

### 3. **Template HTML: `dashboard-gestion.component.html`**
📁 **Ubicación:** `/frontend/cli/src/app/dashboard-gestion/dashboard-gestion.component.html`

**Añadido:**
```html
<!-- Botones de Exportación -->
<div class="export-buttons-container mb-lg">
  <div class="export-buttons">
    <button class="btn btn-primary" (click)="exportarCSV()" [disabled]="loading">
      <span class="material-symbols-outlined">download</span>
      <span>Exportar CSV</span>
    </button>
    <button class="btn btn-secondary" (click)="exportarPDF()" [disabled]="loading">
      <span class="material-symbols-outlined">picture_as_pdf</span>
      <span>Exportar PDF</span>
    </button>
  </div>
</div>
```

**Ubicación en el layout:** Justo debajo de los filtros del dashboard, antes de la sección de loading.

### 4. **Estilos CSS: `dashboard-gestion.component.css`**
📁 **Ubicación:** `/frontend/cli/src/app/dashboard-gestion/dashboard-gestion.component.css`

**Estilos añadidos (Sección 2.5):**
```css
.export-buttons-container {
  display: flex;
  justify-content: flex-end;          /* Alineados a la derecha */
  gap: var(--space-md);                /* Espaciado uniforme */
  padding: var(--space-md) 0;          /* Padding vertical */
  border-bottom: 1px solid var(--border-color);  /* Separador visual */
}

.export-buttons {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.export-buttons .btn {
  flex-shrink: 0;
}

/* Responsive: En dispositivos móviles, botones en fila completa */
@media (max-width: 768px) {
  .export-buttons-container {
    justify-content: stretch;
  }
  
  .export-buttons {
    width: 100%;
    flex-direction: column;
  }
  
  .export-buttons .btn {
    width: 100%;
  }
}
```

**Características de diseño:**
- ✅ Utiliza variables CSS del `style_guide.md`
- ✅ Botones `.btn-primary` (CSV) y `.btn-secondary` (PDF) siguiendo jerarquía
- ✅ Iconos Material Symbols: `download` y `picture_as_pdf`
- ✅ Responsive: En móviles los botones se apilan verticalmente
- ✅ Espaciado consistente con el 8pt grid (`var(--space-md)`)
- ✅ Borde inferior para separación visual

---

## 🔌 Endpoints del Backend Utilizados

### Endpoint CSV
```
POST /export/turnos/csv
Body: TurnoFilterDTO
Response: text/plain (contenido CSV)
```

### Endpoint PDF
```
POST /export/turnos/pdf
Body: TurnoFilterDTO
Response: text/html (contenido HTML para convertir a PDF en frontend)
```

**Nota:** El backend retorna HTML que se convierte a PDF en el frontend usando `html2canvas` y `jsPDF`. Esto permite:
- Menos carga en el servidor
- Mejor manejo de formatos complejos
- Conversión en tiempo real en el navegador

---

## 📊 Flujo de Exportación

### CSV
```
Usuario hace click → exportarCSV() 
  ↓
Valida que no esté cargando
  ↓
Llama ExportService.exportarTurnosCSV(filtros)
  ↓
Backend procesa y retorna CSV como string
  ↓
ExportService.descargarCSV() crea Blob y descarga
  ↓
Archivo `turnos_YYYY-MM-DD.csv` se guarda
```

### PDF
```
Usuario hace click → exportarPDF()
  ↓
Valida que no esté cargando
  ↓
Llama ExportService.exportarTurnosPDF(filtros)
  ↓
Backend procesa y retorna HTML como string
  ↓
ExportService.descargarPDF() convierte HTML → Canvas → PDF
  ↓
jsPDF crea PDF pagado automáticamente
  ↓
Archivo `turnos_YYYY-MM-DD.pdf` se guarda
```

---

## ⚙️ Detalles Técnicos

### Conversión HTML a PDF (Frontend)

El servicio utiliza una estrategia en dos pasos:

1. **html2canvas**: Convierte el HTML a un Canvas 2D
   - Escala 2x para mejor calidad
   - Configurado para permitir imágenes externas
   
2. **jsPDF**: Crea un PDF desde el canvas
   - Formato A4 (210mm x 297mm)
   - Orientación vertical
   - Paginación automática si el contenido es más largo que una página

### Manejo de Errores

- ✅ Try-catch en la conversión a PDF
- ✅ Alertas al usuario en caso de error
- ✅ Limpieza de elementos temporales
- ✅ Restauración del estado de `loading`

### Filtros Soportados

El `TurnoFilterDTO` soporta múltiples filtros:
- `estado` - Estado del turno (PROGRAMADO, CONFIRMADO, CANCELADO, etc.)
- `fechaDesde` / `fechaHasta` - Rango de fechas
- `centroId` - ID del centro de atención
- `pacienteId` - ID del paciente
- `staffMedicoId` - ID del médico
- `especialidadId` - ID de la especialidad
- `consultorioId` - ID del consultorio
- Y otros filtros adicionales según necesidad

**Nota actual:** Los métodos de exportación utilizan filtros vacíos (`null`) para exportar todos los turnos. Esto puede extenderse para usar filtros del dashboard.

---

## 🎨 Estilos Respetados

Se han seguido fielmente las pautas de `style_guide.md`:

| Aspecto | Implementación |
|--------|-----------------|
| **Colores** | Variables CSS del `:root` (`--color-accent`, `--color-*`) |
| **Tipografía** | Roboto, con pesos `--font-weight-*` |
| **Espaciado** | 8pt Grid usando `--space-*` variables |
| **Botones** | Clases `.btn-primary`, `.btn-secondary` con jerarquía |
| **Iconografía** | Material Symbols con `download` y `picture_as_pdf` |
| **Radio bordes** | `--border-radius-md` y `--border-radius-lg` |
| **Sombras** | `--box-shadow-soft` en cards |

---

## 🧪 Testing Manual

### Pasos para probar:

1. **Iniciar la aplicación:**
   ```bash
   ./lpl up
   ```

2. **Navegar al Dashboard de Gestión:**
   - Ir a `http://localhost:4200/admin/dashboard-gestion`

3. **Probar exportación CSV:**
   - Hacer click en botón "Exportar CSV"
   - Verificar que se descarga `turnos_YYYY-MM-DD.csv`
   - Abrir en Excel/Calc para verificar formato

4. **Probar exportación PDF:**
   - Hacer click en botón "Exportar PDF"
   - Verificar que se descarga `turnos_YYYY-MM-DD.pdf`
   - Abrir en lector PDF para verificar contenido

5. **Probar con filtros (futuro):**
   - Aplicar filtros en el dashboard
   - Exportar - debería incluir solo datos filtrados

6. **Probar responsive:**
   - Redimensionar ventana a < 768px
   - Verificar que botones se apilen verticalmente

---

## 📦 Dependencias Utilizadas

| Librería | Versión | Uso |
|----------|---------|-----|
| `jsPDF` | 3.0.3 | Generación de PDFs |
| `html2canvas` | 1.4.1 | Conversión de HTML a canvas/imagen |
| `@angular/common` | 19.2.0 | Directivas Angular |
| `rxjs` | 7.8.0 | Manejo de observables |

**✅ Todas las dependencias ya estaban instaladas en `package.json`**

---

## 🚀 Mejoras Futuras

1. **Integración de filtros:**
   - Usar los filtros actuales del dashboard en la exportación
   - Mostrar indicador de cantidad de registros a exportar

2. **Estilos personalizados en PDF:**
   - Agregar logo del centro de atención
   - Incluir fecha/hora de generación
   - Footer con información de usuario

3. **Exportación avanzada:**
   - Agregar más formatos (Excel, JSON)
   - Opción de seleccionar columnas a exportar
   - Visualización previa antes de descargar

4. **Indicadores de progreso:**
   - Barra de progreso para exportaciones grandes
   - Estimación de tiempo de generación

5. **Auditoría:**
   - Registrar en logs quién exportó qué y cuándo
   - Incluir información de auditoría en documentos exportados

---

## 📝 Archivos Modificados

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `/frontend/cli/src/app/services/export.service.ts` | ✨ Nuevo | Servicio de exportación |
| `/frontend/cli/src/app/dashboard-gestion/dashboard-gestion.component.ts` | 🔧 Modificado | +3 métodos, import ExportService |
| `/frontend/cli/src/app/dashboard-gestion/dashboard-gestion.component.html` | 🔧 Modificado | +9 líneas de HTML |
| `/frontend/cli/src/app/dashboard-gestion/dashboard-gestion.component.css` | 🔧 Modificado | +33 líneas de CSS |

---

## ✅ Checklist de Completitud

- ✅ Servicio ExportService creado
- ✅ Métodos exportarCSV() y exportarPDF() implementados
- ✅ Botones añadidos en HTML
- ✅ Estilos CSS siguiendo style_guide.md
- ✅ Material Symbols utilizados (download, picture_as_pdf)
- ✅ Responsive design implementado
- ✅ Manejo de errores
- ✅ Sin errores de compilación
- ✅ Endpoints del backend disponibles
- ✅ Librerías PDF ya instaladas

---

## 📞 Soporte

Para cualquier duda sobre la implementación:
1. Revisar los comentarios en el código
2. Consultar `style_guide.md` para convenciones
3. Verificar `ExportPresenter.java` para endpoints disponibles

**Última actualización:** 12 de noviembre de 2025
