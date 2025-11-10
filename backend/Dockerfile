# Dockerfile para Render (Producción)
# Build stage
FROM maven:3-eclipse-temurin-17-alpine AS build

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
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copiar el JAR compilado desde el stage de build
COPY --from=build /app/target/*.jar app.jar

# Exponer el puerto 8080
EXPOSE 8080

# Variable de entorno para el puerto (Render usa PORT)
ENV PORT=8080

# Comando para ejecutar la aplicación
# Usar el puerto de la variable de entorno PORT
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
