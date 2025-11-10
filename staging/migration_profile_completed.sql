-- Migración: Añadir campo profileCompleted a la tabla Paciente
-- Fecha: 2025-10-15
-- Descripción: Añade un campo booleano para rastrear si el perfil del paciente está completo
--              Esto es necesario para el flujo de onboarding progresivo de usuarios de Google

-- Añadir la columna profileCompleted con valor por defecto TRUE para usuarios existentes
ALTER TABLE paciente 
ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT TRUE;

-- Actualizar comentario de la columna para documentación
COMMENT ON COLUMN paciente.profile_completed IS 'Indica si el perfil del paciente está completo. FALSE para usuarios de Google que aún no completaron sus datos.';

-- Actualizar a FALSE solo para usuarios con datos temporales de Google
-- (DNI >= 1000000000000 es temporal generado por timestamp)
UPDATE paciente 
SET profile_completed = FALSE 
WHERE dni >= 1000000000000 
   OR telefono LIKE 'GOOGLE_%';

-- Verificar la migración
SELECT 
    id,
    nombre,
    apellido,
    email,
    dni,
    telefono,
    profile_completed
FROM paciente
ORDER BY id;

-- Estadísticas post-migración
SELECT 
    profile_completed,
    COUNT(*) as cantidad
FROM paciente
GROUP BY profile_completed;
