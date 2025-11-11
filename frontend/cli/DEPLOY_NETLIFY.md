# Guía de Deploy en Netlify para TurneroWeb

## ✅ Archivos Creados

- ✅ `netlify.toml` - Configuración de build y deploy
- ✅ `src/_redirects` - Redirecciones para Angular Router (SPA)
- ✅ `.nvmrc` - Especifica versión de Node.js
- ✅ `src/environments/environment.ts` - Configuración desarrollo
- ✅ `src/environments/environment.prod.ts` - Configuración producción
- ✅ `angular.json` - Actualizado con fileReplacements y _redirects en assets
- ✅ `update-services.sh` - Script para ayudar con actualización de services

## 📋 Configuración en Netlify Dashboard

### Build Settings

| Campo | Valor |
|-------|-------|
| **Base directory** | `frontend/cli` |
| **Build command** | `npm ci && ng build --configuration production` |
| **Publish directory** | `dist/cli` |
| **Deploy branch** | `dev` (o `main`) |

### Environment Variables

**Dejar VACÍO** - La configuración está en `environment.prod.ts`

## 🔧 Pasos Previos al Deploy

### 1. Actualizar Services para usar Environment

**CRÍTICO**: Todos tus services (*.service.ts) deben usar `environment.apiUrl` en producción.

#### Ejemplo de Actualización Manual:

**ANTES:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private url = 'rest/api/auth';
  
  constructor(private http: HttpClient) {}
}
```

**DESPUÉS:**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DataPackage } from '../data.package';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // En producción: https://turneroweb.onrender.com/api/auth
  // En desarrollo: rest/api/auth
  private url = environment.production 
    ? `${environment.apiUrl}/api/auth`
    : 'rest/api/auth';
  
  constructor(private http: HttpClient) {}
}
```

#### Lista de Services a Actualizar:

```bash
# Ver todos los services que necesitan actualización
find src/app -name "*.service.ts" | grep -v environment
```

**Services principales:**
- `src/app/inicio-sesion/inicio-sesion.service.ts` (AuthService)
- `src/app/centrosAtencion/*.service.ts`
- `src/app/consultorios/*.service.ts`
- `src/app/especialidades/*.service.ts`
- `src/app/medicos/*.service.ts`
- `src/app/pacientes/*.service.ts`
- `src/app/turnos/*.service.ts`
- `src/app/agenda/*.service.ts`
- `src/app/operador/*.service.ts`
- `src/app/staffMedicos/*.service.ts`
- Y TODOS los demás `*.service.ts`

### 2. Verificar Build Local

```bash
cd frontend/cli

# Instalar dependencias
npm install

# Build de producción
npm run build

# Verificar output
ls -la dist/cli/

# Verificar que _redirects está en el build
cat dist/cli/_redirects
# Debe mostrar: /*    /index.html   200
```

### 3. Probar Localmente con Build de Producción

```bash
# Instalar servidor estático
npm install -g http-server

# Servir build de producción
cd dist/cli
http-server -p 8080

# Abrir en navegador: http://localhost:8080
# Verificar que las rutas funcionan y conecta con backend de Render
```

## 🚀 Deploy a Netlify

### Opción A: Deploy desde Git (Recomendado)

1. **Commit cambios:**
```bash
git add frontend/cli/netlify.toml \
        frontend/cli/src/_redirects \
        frontend/cli/.nvmrc \
        frontend/cli/src/environments/ \
        frontend/cli/angular.json \
        frontend/cli/src/app/**/*.service.ts

git commit -m "feat: configurar frontend para deploy en Netlify"
git push origin dev
```

2. **En Netlify Dashboard:**
   - Login en https://app.netlify.com/
   - "Add new site" → "Import an existing project"
   - Seleccionar Git provider (GitHub/GitLab)
   - Seleccionar repositorio `TurneroWeb`
   - Configurar build settings (ver tabla arriba)
   - Click "Deploy site"

### Opción B: Deploy desde Netlify CLI

```bash
# Instalar CLI
npm install -g netlify-cli

# Login
netlify login

# Desde frontend/cli/
cd frontend/cli

# Inicializar
netlify init

# Deploy a producción
netlify deploy --prod
```

## 🔐 Post-Deploy: Actualizar Backend CORS

Una vez que obtengas la URL de Netlify (ej: `https://turneroweb-cheturno.netlify.app`):

### 1. Actualizar SecurityConfig.java

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(request -> {
            CorsConfiguration config = new CorsConfiguration();
            config.setAllowedOrigins(Arrays.asList(
                "http://localhost:4200",
                "https://turneroweb-cheturno.netlify.app" // ← Agregar URL de Netlify
            ));
            config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
            config.setAllowedHeaders(Arrays.asList("*"));
            config.setAllowCredentials(true);
            config.setExposedHeaders(Arrays.asList("Authorization"));
            return config;
        }))
        // ...existing code...
}
```

### 2. Actualizar Variable APP_URL en Render

```bash
# En Render Dashboard > Environment Variables
APP_URL=https://turneroweb-cheturno.netlify.app
```

### 3. Commit y Push Backend

```bash
git add backend/src/main/java/unpsjb/labprog/backend/config/SecurityConfig.java
git commit -m "feat: agregar CORS para Netlify"
git push origin dev
```

## ✅ Checklist Pre-Deploy

- [ ] Todos los `*.service.ts` actualizados para usar `environment`
- [ ] `environment.prod.ts` con URL correcta de Render
- [ ] `angular.json` incluye `_redirects` en assets
- [ ] `angular.json` tiene `fileReplacements` en production config
- [ ] Build local exitoso (`npm run build`)
- [ ] `_redirects` está en `dist/cli/`
- [ ] Commit y push de todos los cambios

## ✅ Checklist Post-Deploy

- [ ] Deploy exitoso en Netlify
- [ ] URL de Netlify obtenida
- [ ] Login funciona desde Netlify → Render
- [ ] Rutas Angular (SPA routing) funcionan
- [ ] CORS actualizado en backend
- [ ] `APP_URL` actualizado en Render
- [ ] Emails funcionan con nueva URL

## 🐛 Troubleshooting

### Error: "404 Not Found" en rutas Angular
**Solución**: Verificar que `_redirects` esté en `dist/cli/`

### Error: CORS en console del navegador
**Solución**: Actualizar `SecurityConfig.java` con URL exacta de Netlify

### Error: "Cannot find module 'environment'"
**Solución**: Verificar que `fileReplacements` esté en `angular.json`

### Build falla con "Budget exceeded"
**Solución**: Aumentar límites en `angular.json` budgets

## 📊 Estructura Final del Proyecto

```
frontend/cli/
├── netlify.toml              # ✅ Configuración Netlify
├── .nvmrc                    # ✅ Versión Node.js
├── angular.json              # ✅ Actualizado
├── package.json
├── proxy.conf.json           # Solo para dev local
├── src/
│   ├── _redirects           # ✅ Redirecciones SPA
│   ├── environments/
│   │   ├── environment.ts           # ✅ Development
│   │   └── environment.prod.ts      # ✅ Production
│   └── app/
│       └── **/*.service.ts  # ⚠️ Actualizar manualmente
└── dist/cli/                # Output del build
```

## 🎯 URLs del Sistema

- **Backend (Render)**: https://turneroweb.onrender.com
- **Frontend (Netlify)**: https://[tu-sitio].netlify.app
- **Base de Datos (Neon)**: PostgreSQL en Neon

## 📞 Soporte

Si encuentras problemas:
1. Verificar logs de build en Netlify dashboard
2. Verificar console del navegador (F12)
3. Verificar logs de backend en Render
4. Verificar que CORS esté configurado correctamente
