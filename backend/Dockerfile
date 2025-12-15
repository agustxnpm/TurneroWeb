# Dockerfile para Render (Producción)
# Build stage
# CAMBIO 1: Usamos la imagen Debian "slim" para evitar problemas de musl libc
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Copiar archivos de configuración de Maven primero (para aprovechar cache de Docker)
COPY pom.xml .
# Descargar dependencias (se cachea si pom.xml no cambia)
RUN mvn dependency:go-offline -B

# Copiar el código fuente
COPY src ./src

# Compilar y empaquetar la aplicación (sin ejecutar tests para acelerar build)
RUN mvn clean package -DskipTests

# Runtime stage
# CAMBIO 2 (CRÍTICO): Usamos la imagen Debian "slim"
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copiar el JAR compilado desde el stage de build
COPY --from=build /app/target/*.jar app.jar

# Exponer el puerto 8080
EXPOSE 8080

# Variable de entorno para el puerto (Render usa PORT)
ENV PORT=8080

# Comando para ejecutar la aplicación
ENTRYPOINT exec java -Dserver.port=${PORT} -jar app.jar