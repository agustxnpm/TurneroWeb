# Guía de Estilos para Refactorización de TurneroWeb

## 1. Objetivo Principal

El objetivo es crear una interfaz **minimalista, limpia y altamente usable** para usuarios no técnicos. La consistencia es la clave. Todas las decisiones de estilo deben seguir estas reglas para eliminar la ambigüedad.

---

## 2. Paleta de Colores

Todos los colores deben ser aplicados usando estas variables CSS. **No se deben usar colores hardcodeados** (ej. `#FFF`, `red`, `rgb(...)`) en los componentes.

```css
/* :root en styles.css */
:root {
  /* Colores Base */
  --color-background: #F8F9FA; /* Gris muy claro para el fondo de la app */
  --color-surface: #FFFFFF;    /* Blanco para cards, modales y superficies elevadas */

  /* Colores de Texto */
  --text-main: #212529;         /* Gris oscuro para texto principal y títulos */
  --text-secondary: #6C757D;    /* Gris medio para texto descriptivo, placeholders y etiquetas */
  --text-on-accent: #FFFFFF;    /* Texto blanco para usar sobre el color de acento */

  /* Color de Acento (Marca) */
  --color-accent: #0d6efd;      /* Azul amigable y accesible para acciones primarias */
  --color-accent-hover: #0b5ed7; /* Versión más oscura para el estado :hover */

  /* Colores Semánticos (Feedback) */
  --color-success: #198754;     /* Verde para confirmaciones */
  --color-danger: #dc3545;      /* Rojo para errores y acciones destructivas */
  --color-warning: #ffc107;     /* Ámbar para advertencias */
  --color-info: #0dcaf0;        /* Azul claro para mensajes informativos */

  /* Bordes y Sombras */
  --border-color: #dee2e6;
  --box-shadow-soft: 0 4px 8px rgba(0, 0, 0, 0.05);
}
```

---

## 3. Tipografía

Se utilizará una única familia de fuentes: **Roboto**.

### Instalación

Importar desde Google Fonts en el `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
```

### Variables y Reglas

```css
/* Aplicar en body o :root en styles.css */
body {
  font-family: 'Roboto', sans-serif;
  font-size: 16px; /* Tamaño base del texto */
  font-weight: 400; /* Peso base */
  line-height: 1.6; /* Interlineado base */
  color: var(--text-main);
  background-color: var(--color-background);
}

/* Variables de tipografía */
:root {
  --font-size-body: 16px;
  --font-size-small: 14px;
  --font-size-h1: 32px;
  --font-size-h2: 24px;
  --font-size-h3: 20px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;

  --line-height-body: 1.6;
  --line-height-heading: 1.3;
}

/* Aplicación de jerarquía */
h1 {
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-heading);
}
h2 {
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-heading);
}
h3 {
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-heading);
}
small, .text-small {
  font-size: var(--font-size-small);
  color: var(--text-secondary);
}
```

---

## 4. Sistema de Espaciado (8pt Grid)

Todos los `margin`, `padding` y `gap` deben usar **múltiplos de 8px**.

```css
/* Variables de espaciado en :root */
:root {
  --space-xs: 4px;   /* Extra pequeño */
  --space-sm: 8px;   /* Pequeño */
  --space-md: 16px;  /* Mediano (estándar) */
  --space-lg: 24px;  /* Grande */
  --space-xl: 32px;  /* Extra grande */
  --space-xxl: 48px; /* Enorme */
}
```

### Ejemplos de uso

- `gap: var(--space-md);` en un flex o grid
- `padding: var(--space-lg);` en un card
- `margin-bottom: var(--space-md);` entre campos de formulario

---

## 5. Componentes

### Botones

- **Radio de borde:** `8px` para todos los botones
- **Padding:** `12px 24px` para botones de tamaño normal

#### Jerarquía de Clases

**`.btn-primary`**: Acción principal

```css
.btn-primary {
  background-color: var(--color-accent);
  color: var(--text-on-accent);
  border: 1px solid var(--color-accent);
}
.btn-primary:hover {
  background-color: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}
```

**`.btn-secondary`**: Acción alternativa

```css
.btn-secondary {
  background-color: transparent;
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
}
.btn-secondary:hover {
  background-color: var(--color-accent);
  color: var(--text-on-accent);
}
```

**`.btn-tertiary` o `.btn-link`**: Acción de baja prioridad

```css
.btn-link {
  background-color: transparent;
  color: var(--color-accent);
  border: none;
  text-decoration: underline;
}
```

**Botón de Peligro**: Usar la clase `.btn-danger` para acciones destructivas

```css
.btn-danger {
  background-color: var(--color-danger);
  color: var(--text-on-accent);
  border: 1px solid var(--color-danger);
}
```

---

### Formularios (`<input>`, `<select>`, `<textarea>`)

#### Etiquetas (`<label>`)

- Siempre visibles, posicionadas **encima** del campo
- `font-weight: var(--font-weight-medium)`

#### Estilo de Campos

```css
input, select, textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--color-surface);
  font-size: var(--font-size-body);
  color: var(--text-main);
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}
```

#### Validación de Errores

Mostrar un texto de ayuda debajo del campo con `color: var(--color-danger)` y aplicar una clase `.is-invalid` al campo para cambiar su borde a rojo.

---

### Iconografía

**Librería:** Google Material Symbols (Outlined)

#### Instalación

Importar en `index.html`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
```

#### Uso

Siempre acompañados de texto, a menos que la acción sea universal (ej. `close`).

```html
<!-- Ejemplo: Botón con ícono -->
<button class="btn-primary">
  <span class="material-symbols-outlined">calendar_today</span>
  <span>Solicitar Turno</span>
</button>
```

#### Estilo

Alinear verticalmente el ícono con el texto:

```css
.material-symbols-outlined {
  vertical-align: middle;
  margin-right: var(--space-sm);
}
```

---

### Cards y Modales

- **Fondo:** `background-color: var(--color-surface)`
- **Borde:** `border: 1px solid var(--border-color)`
- **Radio de borde:** `16px`
- **Sombra:** `box-shadow: var(--box-shadow-soft)`
- **Padding interno:** `var(--space-lg)` o `var(--space-xl)`