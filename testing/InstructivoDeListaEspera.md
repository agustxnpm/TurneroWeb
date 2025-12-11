# 📘 Guía de Ejecución: Test de Integración E2E (Registro -> Lista de Espera)

Este documento detalla los pasos necesarios para configurar y ejecutar el test de integración automatizado `5a_RegistroListaEspera.feature`. Este test valida el flujo completo de un paciente interactuando directamente con la API del Backend.

---

## ✅ 1. Prerrequisitos

Antes de comenzar, asegúrate de tener instalado en tu sistema:

1.  **Docker Desktop** (o Docker Engine + Docker Compose).
2.  **Git** (para clonar el repositorio).
3.  **Terminal** (Bash, PowerShell o CMD).

---

## 🚀 2. Preparación del Entorno

Para que el test funcione, los servicios de Backend y Base de Datos deben estar corriendo.

1.  **Levantar los servicios:**
    Usa tu script `lpl` o Docker Compose directamente:

    ```bash
    ./lpl start
    # O si prefieres manual:
    docker compose up -d backend database
    ```

2.  **Verificar estado:**
    Asegúrate de que el servicio de base de datos se llame `database` y el backend `backend`.
    ```bash
    docker compose ps
    ```
    _Deberías ver `database` en estado `Up`._

---

## 📦 3. Instalación de Dependencias

El test utiliza la librería `pg` para conectarse a la base de datos y obtener el token de activación. Como el entorno es Docker, debemos instalarla dentro del contenedor de pruebas.

Ejecuta este comando una sola vez:

```bash
docker compose run --rm testing npm install pg
```
