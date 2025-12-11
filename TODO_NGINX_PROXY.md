# TODO: Implementar Reverse Proxy con Nginx (Solución Correcta)

## ⚠️ Problema Actual
- Frontend accede directamente a `http://168.197.48.210:8080`
- Backend expuesto públicamente en puerto 8080
- CORS configurado como parche temporal
- Seguridad comprometida (puerto 8080 accesible desde cualquier lugar)

## ✅ Solución Correcta: Reverse Proxy

### Arquitectura Objetivo
```
Usuario → http://cheturno.site/        → Nginx → Frontend (contenedor interno)
Usuario → http://cheturno.site/api/*   → Nginx → Backend:8080 (contenedor interno)
```

**Beneficios:**
- ✅ Un solo punto de entrada (puerto 80/443)
- ✅ Backend **no expuesto** públicamente (solo accesible internamente)
- ✅ No necesitas CORS (mismo dominio)
- ✅ Fácil agregar HTTPS con Let's Encrypt
- ✅ Mejor seguridad y rendimiento

---

## 📋 Pasos de Implementación

### 1. Actualizar `frontend/nginx-custom.conf`

Reemplazar contenido actual por:

```nginx
server {
    listen 80;
    server_name cheturno.site www.cheturno.site;

    # Frontend (Angular)
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html =404;
    }

    # Backend API (Reverse Proxy)
    location /api/ {
        # Redirigir a backend interno (sin exponer puerto 8080)
        proxy_pass http://backend:8080/;
        
        # Headers necesarios para Spring Boot
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para peticiones largas
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 2. Actualizar `docker-compose.prod.yml`

**Cambiar sección backend:**
```yaml
backend:
  ports:
    # ANTES: - "8080:8080"  # ❌ Expuesto públicamente
    # DESPUÉS: NO exponer puerto, solo red interna Docker
  expose:
    - "8080"  # ✅ Solo accesible dentro de la red Docker
  environment:
    APP_ALLOWED_ORIGINS: http://cheturno.site  # Ya no necesita múltiples orígenes
```

### 3. Actualizar Frontend (Angular)

**Archivos a modificar:**

#### `frontend/cli/src/environments/environment.prod.ts`
```typescript
export const environment = {
  production: true,
  // ANTES: apiUrl: 'http://168.197.48.210:8080'
  apiUrl: '/api',  // ✅ Usa ruta relativa (Nginx hace el proxy)
  googleClientId: '792207143081-bjp6agdmp0a7aip4tq0ta35u1j50fuuk.apps.googleusercontent.com'
};
```

#### Verificar servicios Angular
Buscar todos los servicios que usen URLs hardcodeadas:
```bash
grep -r "168.197.48.210:8080" frontend/cli/src/app/
grep -r "localhost:8080" frontend/cli/src/app/
```

Reemplazar por:
```typescript
// ANTES: private apiUrl = 'http://168.197.48.210:8080/endpoint';
// DESPUÉS: private apiUrl = `${environment.apiUrl}/endpoint`;
```

### 4. Limpiar Configuración CORS (Backend)

**`backend/src/main/resources/application.properties`**
```properties
# Eliminar múltiples orígenes, solo necesitas uno
app.allowed.origins=${APP_ALLOWED_ORIGINS:http://localhost:4200,http://cheturno.site}
```

### 5. Rebuild y Deploy

```bash
# Detener servicios actuales
docker-compose -f docker-compose.prod.yml down

# Rebuild con nueva configuración
docker-compose -f docker-compose.prod.yml build --no-cache

# Levantar servicios
docker-compose -f docker-compose.prod.yml up -d

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 6. Verificar Funcionamiento

```bash
# Desde el servidor
curl http://localhost/api/

# Desde fuera del servidor
curl http://cheturno.site/api/

# El puerto 8080 NO debe responder desde fuera
curl http://168.197.48.210:8080/  # Debería fallar (timeout/refused)
```

---

## 🔒 BONUS: Agregar HTTPS (Let's Encrypt)

Una vez funcione con HTTP, agregar certificado SSL:

### Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### Obtener Certificado
```bash
sudo certbot --nginx -d cheturno.site -d www.cheturno.site
```

### Actualizar `nginx-custom.conf`
Certbot lo hará automáticamente, o puedes agregar:
```nginx
server {
    listen 443 ssl http2;
    server_name cheturno.site www.cheturno.site;

    ssl_certificate /etc/letsencrypt/live/cheturno.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cheturno.site/privkey.pem;

    # ... resto de la configuración
}

# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name cheturno.site www.cheturno.site;
    return 301 https://$server_name$request_uri;
}
```

### Renovación Automática
```bash
sudo certbot renew --dry-run
```

---

## 📊 Comparación

| Aspecto | Actual (CORS) | Con Proxy |
|---------|---------------|-----------|
| Seguridad | ⚠️ Backend expuesto | ✅ Backend interno |
| CORS | ❌ Necesario | ✅ No necesario |
| Puertos | 80 + 8080 | Solo 80/443 |
| URLs | IP:8080 hardcodeadas | Rutas relativas |
| HTTPS | Difícil | Fácil (Certbot) |
| Profesional | ❌ | ✅ |

---

## ⏱️ Tiempo Estimado de Implementación
- Configuración Nginx: 10 minutos
- Actualizar docker-compose: 5 minutos
- Actualizar frontend: 15 minutos (buscar/reemplazar URLs)
- Testing: 10 minutos
- **Total: ~40 minutos**

---

## 🆘 Troubleshooting

### Problema: 502 Bad Gateway
**Solución:** Verificar que el nombre del servicio en `proxy_pass` coincida con docker-compose:
```nginx
proxy_pass http://backend:8080/;  # "backend" es el nombre del servicio
```

### Problema: CORS persiste
**Solución:** Limpiar caché del navegador y verificar que las URLs usen `/api/` en lugar de `http://168.197.48.210:8080/`

### Problema: Assets del frontend no cargan
**Solución:** Verificar la ruta `root` en nginx:
```nginx
root /usr/share/nginx/html;
```

---

## 📚 Referencias
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Docker Networking](https://docs.docker.com/network/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)
