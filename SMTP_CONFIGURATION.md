# Configuración SMTP por Entorno

## Problema
Los proveedores de hosting como Render, Heroku, Railway bloquean ciertos puertos SMTP por seguridad.

## Puertos SMTP Comunes

### Desarrollo Local
- **Puerto 587**: SMTP con STARTTLS (recomendado)
- **Puerto 465**: SMTP con SSL/TLS (puede fallar en algunos proveedores)

### Producción (Render/Heroku/etc)
- **Puerto 587**: SMTP con STARTTLS (obligatorio - puerto 465 bloqueado)
- **Puerto 25**: Generalmente bloqueado

## Configuración por Entorno

### Variables de Entorno

```bash
# Desarrollo
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SSL_ENABLE=false
MAIL_DEBUG=true

# Producción (Render)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SSL_ENABLE=false
MAIL_DEBUG=false
```

### Perfiles Spring

```bash
# Desarrollo
java -jar app.jar --spring.profiles.active=dev

# Producción
java -jar app.jar --spring.profiles.active=prod
```

### Variables en Render

En el dashboard de Render, configurar:

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SSL_ENABLE=false
MAIL_DEBUG=false
MAIL_USERNAME=tu-email@gmail.com
MAIL_PASSWORD=tu-app-password
```

## Verificación

Para verificar que funciona:

```bash
# Probar envío de email
curl -X POST http://localhost:8080/admins/test-encuesta-invitaciones
```

Los logs mostrarán si la conexión SMTP fue exitosa.