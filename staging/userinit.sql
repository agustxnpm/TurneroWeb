-- ================================================================================
-- SCRIPT DE INICIALIZACIÓN MULTI-TENANT - TurneroWeb
-- ================================================================================
-- Este script crea un conjunto completo de datos para probar la arquitectura
-- multi-tenant con 3 clínicas independientes, cada una con su staff completo.
-- ================================================================================

-- =====================================
-- 1. INSERTAR OBRAS SOCIALES
-- =====================================

DO $$
BEGIN
    INSERT INTO obra_social (id, nombre, codigo, descripcion) VALUES
    (1, 'OSDE', 'OSDE001', 'Obra Social de los Empleados de Comercio'),
    (2, 'Swiss Medical', 'SWISS001', 'Swiss Medical Group'),
    (3, 'Galeno', 'GALENO001', 'Galeno Argentina')
    ON CONFLICT (codigo) DO NOTHING;
    RAISE NOTICE '✅ Obras Sociales insertadas correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Obras Sociales: %', SQLERRM;
END $$;

-- =====================================
-- 2. INSERTAR ESPECIALIDADES
-- =====================================

DO $$
BEGIN
    INSERT INTO especialidad (id, nombre, descripcion) VALUES
    (1, 'Cardiología', 'Especialidad médica que se ocupa del corazón y sistema cardiovascular'),
    (2, 'Pediatría', 'Especialidad médica dedicada al cuidado de niños y adolescentes'),
    (3, 'Traumatología', 'Especialidad médica que trata lesiones del sistema músculo-esquelético')
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE '✅ Especialidades insertadas correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Especialidades: %', SQLERRM;
END $$;

-- =====================================
-- 3. INSERTAR CENTROS DE ATENCIÓN
-- =====================================

DO $$
BEGIN
    INSERT INTO centro_atencion (id, nombre, direccion, localidad, provincia, telefono, latitud, longitud) VALUES
    (1, 'Clínica Santa María', 'Av. San Martín 123', 'Trelew', 'Chubut', '+5492804501111', -43.2489, -65.3051),
    (2, 'Clínica del Sur', 'Calle Belgrano 456', 'Trelew', 'Chubut', '+5492804502222', -43.2525, -65.3089),
    (3, 'Consultorios del Sol', 'Av. Fontana 789', 'Trelew', 'Chubut', '+5492804503333', -43.2456, -65.3012)
    ON CONFLICT (nombre) DO NOTHING;
    RAISE NOTICE '✅ Centros de Atención insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Centros de Atención: %', SQLERRM;
END $$;

-- =====================================
-- 4. INSERTAR CONSULTORIOS (4 por centro)
-- =====================================

DO $$
BEGIN
    -- Consultorios Clínica Santa María
    INSERT INTO consultorio (numero, nombre, centro_atencion_id) VALUES
    (1, 'Consultorio A', 1),
    (2, 'Consultorio B', 1),
    (3, 'Consultorio C', 1),
    (4, 'Consultorio D', 1);
    RAISE NOTICE '✅ Consultorios Clínica Santa María insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Consultorios Clínica Santa María: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Consultorios Clínica del Sur
    INSERT INTO consultorio (numero, nombre, centro_atencion_id) VALUES
    (1, 'Consultorio Sur 1', 2),
    (2, 'Consultorio Sur 2', 2),
    (3, 'Consultorio Sur 3', 2),
    (4, 'Consultorio Sur 4', 2);
    RAISE NOTICE '✅ Consultorios Clínica del Sur insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Consultorios Clínica del Sur: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Consultorios Consultorios del Sol
    INSERT INTO consultorio (numero, nombre, centro_atencion_id) VALUES
    (1, 'Consultorio Sol 1', 3),
    (2, 'Consultorio Sol 2', 3),
    (3, 'Consultorio Sol 3', 3),
    (4, 'Consultorio Sol 4', 3);
    RAISE NOTICE '✅ Consultorios del Sol insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Consultorios del Sol: %', SQLERRM;
END $$;

-- =====================================
-- 4.1 INSERTAR HORARIOS DE CONSULTORIOS
-- =====================================
-- Todos los consultorios atienden de Lunes a Viernes de 08:00 a 18:00

DO $$
DECLARE
    dias TEXT[] := ARRAY['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    dia TEXT;
    consultorio_id INT;
BEGIN
    -- Para cada consultorio (1-12)
    FOR consultorio_id IN 1..12 LOOP
        FOREACH dia IN ARRAY dias LOOP
            INSERT INTO consultorio_horarios (consultorio_id, dia_semana, hora_apertura, hora_cierre, activo)
            VALUES (consultorio_id, dia, '08:00:00', '18:00:00', true)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
    RAISE NOTICE '✅ Horarios de consultorios insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Horarios de consultorios: %', SQLERRM;
END $$;

-- =====================================
-- 5. INSERTAR SUPERADMIN (acceso global)
-- =====================================

DO $$
BEGIN
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES (
        'Super', 'Administrador', 10000000, 'superadmin@turnero.com', '+5492804100000',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'SUPERADMIN',
        true, true, true, true, true,
        NULL -- SUPERADMIN no tiene centro asignado (acceso global)
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ SUPERADMIN insertado correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar SUPERADMIN: %', SQLERRM;
END $$;

-- =====================================
-- 6. INSERTAR ADMINISTRADORES DE CENTRO (1 por clínica)
-- =====================================

DO $$
BEGIN
    -- Admin Clínica Santa María
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES (
        'Carlos', 'Rodríguez', 11111111, 'admin.santamaria@turnero.com', '+5492804111111',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'ADMINISTRADOR',
        true, true, true, true, true,
        1 -- Clínica Santa María
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Admin Clínica Santa María insertado correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Admin Clínica Santa María: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Admin Clínica del Sur
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES (
        'Laura', 'Fernández', 11111112, 'admin.delsur@turnero.com', '+5492804111112',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'ADMINISTRADOR',
        true, true, true, true, true,
        2 -- Clínica del Sur
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Admin Clínica del Sur insertado correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Admin Clínica del Sur: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Admin Consultorios del Sol
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES (
        'Roberto', 'Sánchez', 11111113, 'admin.delsol@turnero.com', '+5492804111113',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'ADMINISTRADOR',
        true, true, true, true, true,
        3 -- Consultorios del Sol
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Admin Consultorios del Sol insertado correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Admin Consultorios del Sol: %', SQLERRM;
END $$;

-- =====================================
-- 7. INSERTAR OPERADORES (2 por clínica)
-- =====================================

DO $$
BEGIN
    -- Operadores Clínica Santa María
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES 
    (
        'Ana', 'Martínez', 22222221, 'operador1.santamaria@turnero.com', '+5492804222221',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'OPERADOR',
        true, true, true, true, true,
        1
    ),
    (
        'Pedro', 'López', 22222222, 'operador2.santamaria@turnero.com', '+5492804222222',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'OPERADOR',
        true, true, true, true, true,
        1
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Operadores Clínica Santa María insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Operadores Clínica Santa María: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Operadores Clínica del Sur
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES 
    (
        'Marta', 'Gómez', 22222223, 'operador1.delsur@turnero.com', '+5492804222223',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'OPERADOR',
        true, true, true, true, true,
        2
    ),
    (
        'Jorge', 'Díaz', 22222224, 'operador2.delsur@turnero.com', '+5492804222224',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'OPERADOR',
        true, true, true, true, true,
        2
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Operadores Clínica del Sur insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Operadores Clínica del Sur: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Operadores Consultorios del Sol
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES 
    (
        'Silvia', 'Torres', 22222225, 'operador1.delsol@turnero.com', '+5492804222225',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'OPERADOR',
        true, true, true, true, true,
        3
    ),
    (
        'Miguel', 'Castro', 22222226, 'operador2.delsol@turnero.com', '+5492804222226',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'OPERADOR',
        true, true, true, true, true,
        3
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Operadores Consultorios del Sol insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Operadores Consultorios del Sol: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Insertar en tabla operador con centro_atencion_id asignado
    INSERT INTO operador (nombre, apellido, dni, email, telefono, activo, centro_atencion_id) VALUES
    ('Ana', 'Martínez', 22222221, 'operador1.santamaria@turnero.com', '+5492804222221', true, 1),
    ('Pedro', 'López', 22222222, 'operador2.santamaria@turnero.com', '+5492804222222', true, 1),
    ('Marta', 'Gómez', 22222223, 'operador1.delsur@turnero.com', '+5492804222223', true, 2),
    ('Jorge', 'Díaz', 22222224, 'operador2.delsur@turnero.com', '+5492804222224', true, 2),
    ('Silvia', 'Torres', 22222225, 'operador1.delsol@turnero.com', '+5492804222225', true, 3),
    ('Miguel', 'Castro', 22222226, 'operador2.delsol@turnero.com', '+5492804222226', true, 3)
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Tabla Operador insertada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar tabla Operador: %', SQLERRM;
END $$;

-- =====================================
-- 8. INSERTAR MÉDICO GLOBAL (Dr. Juan Pérez)
-- =====================================

DO $$
BEGIN
    -- Usuario médico (sin centro asignado - es global)
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES (
        'Dr. Juan', 'Pérez', 33333333, 'medico@turnero.com', '+5492804333333',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'MEDICO',
        true, true, true, true, true,
        NULL -- Médico no tiene centro asignado directamente
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Usuario MEDICO insertado correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Usuario MEDICO: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Tabla médico
    INSERT INTO medico (id, nombre, apellido, dni, email, telefono, matricula) VALUES
    (1, 'Dr. Juan', 'Pérez', 33333333, 'medico@turnero.com', '+5492804333333', 'MP-12345')
    ON CONFLICT (dni) DO NOTHING;
    RAISE NOTICE '✅ Tabla Medico insertada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar tabla Medico: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Relacionar médico con especialidad Cardiología
    INSERT INTO medico_especialidad (medico_id, especialidad_id) 
    SELECT 1, 1
    WHERE NOT EXISTS (
        SELECT 1 FROM medico_especialidad 
        WHERE medico_id = 1 AND especialidad_id = 1
    );
    RAISE NOTICE '✅ Relación Medico-Especialidad insertada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar relación Medico-Especialidad: %', SQLERRM;
END $$;

-- =====================================
-- 9. ASOCIAR MÉDICO AL STAFF DE CADA CLÍNICA
-- =====================================

DO $$
BEGIN
    -- Dr. Pérez trabaja en las 3 clínicas (StaffMedico)
    -- Nota: porcentaje y consultorio son opcionales (pueden ser NULL)
    INSERT INTO staff_medico (id, centro_atencion_id, medico_id, especialidad_id, porcentaje, consultorio_id) 
    VALUES
    (1, 1, 1, 1, NULL, NULL), -- Clínica Santa María - Cardiología
    (2, 2, 1, 1, NULL, NULL), -- Clínica del Sur - Cardiología  
    (3, 3, 1, 1, NULL, NULL)  -- Consultorios del Sol - Cardiología
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE '✅ StaffMedico insertado correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar StaffMedico: %', SQLERRM;
END $$;

-- =====================================
-- 10. INSERTAR PACIENTES (2 por clínica + 2 globales)
-- =====================================

DO $$
BEGIN
    -- Pacientes Clínica Santa María (Users)
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES 
    (
        'María', 'González', 44444441, 'paciente1.santamaria@turnero.com', '+5492804444441',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'PACIENTE',
        true, true, true, true, true,
        NULL -- Pacientes no tienen centro asignado (pueden ir a cualquier centro)
    ),
    (
        'José', 'Ramírez', 44444442, 'paciente2.santamaria@turnero.com', '+5492804444442',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'PACIENTE',
        true, true, true, true, true,
        NULL
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Usuarios Pacientes Santa María insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Usuarios Pacientes Santa María: %', SQLERRM;
END $$;

DO $$
BEGIN
    INSERT INTO paciente (id, nombre, apellido, dni, email, telefono, fecha_nacimiento, profile_completed, obra_social_id) VALUES
    (1, 'María', 'González', 44444441, 'paciente1.santamaria@turnero.com', '+5492804444441', '1985-03-15', true, 1),
    (2, 'José', 'Ramírez', 44444442, 'paciente2.santamaria@turnero.com', '+5492804444442', '1990-07-22', true, 1)
    ON CONFLICT (dni) DO NOTHING;
    RAISE NOTICE '✅ Tabla Pacientes Santa María insertada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar tabla Pacientes Santa María: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Pacientes Clínica del Sur (Users)
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES 
    (
        'Lucía', 'Morales', 44444443, 'paciente1.delsur@turnero.com', '+5492804444443',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'PACIENTE',
        true, true, true, true, true,
        NULL
    ),
    (
        'Fernando', 'Silva', 44444444, 'paciente2.delsur@turnero.com', '+5492804444444',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'PACIENTE',
        true, true, true, true, true,
        NULL
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Usuarios Pacientes del Sur insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Usuarios Pacientes del Sur: %', SQLERRM;
END $$;

DO $$
BEGIN
    INSERT INTO paciente (id, nombre, apellido, dni, email, telefono, fecha_nacimiento, profile_completed, obra_social_id) VALUES
    (3, 'Lucía', 'Morales', 44444443, 'paciente1.delsur@turnero.com', '+5492804444443', '1988-11-30', true, 2),
    (4, 'Fernando', 'Silva', 44444444, 'paciente2.delsur@turnero.com', '+5492804444444', '1992-05-18', true, 2)
    ON CONFLICT (dni) DO NOTHING;
    RAISE NOTICE '✅ Tabla Pacientes del Sur insertada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar tabla Pacientes del Sur: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Pacientes Consultorios del Sol (Users)
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES 
    (
        'Sofía', 'Vargas', 44444445, 'paciente1.delsol@turnero.com', '+5492804444445',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'PACIENTE',
        true, true, true, true, true,
        NULL
    ),
    (
        'Diego', 'Ortiz', 44444446, 'paciente2.delsol@turnero.com', '+5492804444446',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'PACIENTE',
        true, true, true, true, true,
        NULL
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Usuarios Pacientes del Sol insertados correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Usuarios Pacientes del Sol: %', SQLERRM;
END $$;

DO $$
BEGIN
    INSERT INTO paciente (id, nombre, apellido, dni, email, telefono, fecha_nacimiento, profile_completed, obra_social_id) VALUES
    (5, 'Sofía', 'Vargas', 44444445, 'paciente1.delsol@turnero.com', '+5492804444445', '1995-01-12', true, 3),
    (6, 'Diego', 'Ortiz', 44444446, 'paciente2.delsol@turnero.com', '+5492804444446', '1987-09-25', true, 3)
    ON CONFLICT (dni) DO NOTHING;
    RAISE NOTICE '✅ Tabla Pacientes del Sol insertada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar tabla Pacientes del Sol: %', SQLERRM;
END $$;

DO $$
BEGIN
    -- Pacientes globales (pueden ir a cualquier clínica)
    INSERT INTO users (
        nombre, apellido, dni, email, telefono,
        hashed_password, role, enabled, account_non_expired,
        account_non_locked, credentials_non_expired, email_verified,
        centro_atencion_id
    ) VALUES 
    (
        'Agustín', 'Palma', 43808170, 'aguspalqui@hotmail.com', '+5492804432030',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
        'PACIENTE',
        true, true, true, true, true,
        NULL
    )
    ON CONFLICT (email) DO NOTHING;
    RAISE NOTICE '✅ Usuario Paciente Global insertado correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar Usuario Paciente Global: %', SQLERRM;
END $$;

DO $$
BEGIN
    INSERT INTO paciente (id, nombre, apellido, dni, email, telefono, fecha_nacimiento, profile_completed, obra_social_id) VALUES
    (7, 'Agustín', 'Palma', 43808170, 'aguspalqui@hotmail.com', '+5492804432030', '2002-05-15', true, 1)
    ON CONFLICT (dni) DO NOTHING;
    RAISE NOTICE '✅ Tabla Paciente Global insertada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERROR al insertar tabla Paciente Global: %', SQLERRM;
END $$;


-- =====================================
-- 11. ACTUALIZAR SECUENCIAS (CRÍTICO)
-- =====================================
-- Después de insertar datos con IDs explícitos, las secuencias de PostgreSQL
-- NO se actualizan automáticamente. Esto causa errores de "duplicate key"
-- cuando Hibernate intenta generar nuevos IDs.
-- Este bloque actualiza TODAS las secuencias al valor MAX(id) + 1

DO $$
DECLARE
    r RECORD;
    max_id BIGINT;
    next_val BIGINT;
BEGIN
    RAISE NOTICE '🔄 Actualizando secuencias de PostgreSQL...';
    RAISE NOTICE '================================================';
    
    -- Mapeo completo de tabla → secuencia
    -- Incluye tanto convención estándar (*_id_seq) como GenerationType.AUTO (*_seq)
    FOR r IN (
        SELECT * FROM (VALUES
            ('account_activation_tokens', 'account_activation_tokens_id_seq'),
            ('administrador', 'administrador_id_seq'),
            ('audit_log', 'audit_log_id_seq'),
            ('centro_atencion', 'centro_atencion_seq'),
            ('configuracion_excepcional', 'configuracion_excepcional_seq'),
            ('configuracion', 'configuracion_seq'),
            ('consultorio', 'consultorio_id_seq'),
            ('deep_link_token', 'deep_link_token_id_seq'),
            ('disponibilidad_medico', 'disponibilidad_medico_seq'),
            ('encuesta_invitacion', 'encuesta_invitacion_seq'),
            ('encuesta_plantilla', 'encuesta_plantilla_seq'),
            ('encuesta_respuesta', 'encuesta_respuesta_seq'),
            ('especialidad', 'especialidad_seq'),
            ('esquema_turno', 'esquema_turno_seq'),
            ('lista_espera', 'lista_espera_seq'),
            ('medico', 'medico_seq'),
            ('notificaciones', 'notificaciones_id_seq'),
            ('obra_social', 'obra_social_seq'),
            ('operador', 'operador_id_seq'),
            ('paciente', 'paciente_seq'),
            ('password_reset_tokens', 'password_reset_tokens_id_seq'),
            ('preferencia_horaria', 'preferencia_horaria_seq'),
            ('pregunta', 'pregunta_seq'),
            ('staff_medico', 'staff_medico_seq'),
            ('turno', 'turno_seq'),
            ('users', 'users_id_seq')
        ) AS t(table_name, sequence_name)
    ) LOOP
        BEGIN
            -- Verificar si la tabla existe
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                       WHERE table_schema = 'public' 
                       AND table_name = r.table_name) THEN
                
                -- Obtener MAX(id) de la tabla
                EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', r.table_name) INTO max_id;
                
                -- Actualizar secuencia con setval(seq, max_id, is_called=true)
                -- is_called=true significa que max_id ya fue emitido, próximo será max_id+1
                IF max_id > 0 THEN
                    EXECUTE format('SELECT setval(%L, %s, true)', r.sequence_name, max_id);
                    RAISE NOTICE '   ✅ % (seq: %): MAX(id)=%, next=%', 
                                 r.table_name, r.sequence_name, max_id, max_id + 1;
                ELSE
                    -- Tabla vacía: inicializar secuencia en 1
                    EXECUTE format('SELECT setval(%L, 1, false)', r.sequence_name);
                    RAISE NOTICE '   ⚠️  % (seq: %): tabla vacía, next=1', 
                                 r.table_name, r.sequence_name;
                END IF;
            ELSE
                RAISE NOTICE '   ⏭️  Tabla % no existe (seq: %)', r.table_name, r.sequence_name;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING '   ❌ Error en tabla %: %', r.table_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ Proceso de actualización de secuencias completado';
END $$;

-- =====================================
-- RESUMEN DE ESTRUCTURA MULTI-TENANT:
-- =====================================
-- 
-- 📊 CENTROS DE ATENCIÓN (3):
--    1. Clínica Santa María
--    2. Clínica del Sur
--    3. Consultorios del Sol
--
-- 👤 SUPERADMIN (1):
--    Email: superadmin@turnero.com
--    Password: password
--    Centro: NULL (acceso global)
--
-- 🏥 ADMINISTRADORES DE CENTRO (3 - uno por clínica):
--    1. admin.santamaria@turnero.com → Clínica Santa María (ID: 1)
--    2. admin.delsur@turnero.com → Clínica del Sur (ID: 2)
--    3. admin.delsol@turnero.com → Consultorios del Sol (ID: 3)
--    Password: password
--
-- 💼 OPERADORES (6 - dos por clínica):
--    Clínica Santa María: operador1.santamaria@, operador2.santamaria@
--    Clínica del Sur: operador1.delsur@, operador2.delsur@
--    Consultorios del Sol: operador1.delsol@, operador2.delsol@
--    Password: password
--
-- 👨‍⚕️ MÉDICOS (1 global):
--    Email: medico@turnero.com (Dr. Juan Pérez)
--    Password: password
--    Trabaja en las 3 clínicas (asociado via StaffMedico)
--
-- 🏥 CONSULTORIOS (12 - cuatro por clínica):
--    Cada clínica tiene 4 consultorios numerados 1-4
--
-- 🧑‍🤝‍🧑 PACIENTES (7 total):
--    - 6 distribuidos entre clínicas (2 por clínica)
--    - 1 global (Agustín Palma)
--    Password: password
--    Centro: NULL (pueden ir a cualquier clínica)
--
-- 💊 OBRAS SOCIALES (3):
--    1. OSDE
--    2. Swiss Medical
--    3. Galeno
--
-- 🩺 ESPECIALIDADES (3):
--    1. Cardiología
--    2. Pediatría
--    3. Traumatología
--
-- =====================================

SELECT '✅ Script ejecutado exitosamente - Estructura Multi-Tenant creada' AS mensaje;

SELECT 
    '📊 CENTROS DE ATENCIÓN' as categoria,
    COUNT(*) as cantidad
FROM centro_atencion
UNION ALL
SELECT 
    '👤 SUPERADMIN' as categoria,
    COUNT(*) as cantidad
FROM users WHERE role = 'SUPERADMIN'
UNION ALL
SELECT 
    '🏥 ADMINISTRADORES' as categoria,
    COUNT(*) as cantidad
FROM users WHERE role = 'ADMINISTRADOR'
UNION ALL
SELECT 
    '💼 OPERADORES' as categoria,
    COUNT(*) as cantidad
FROM users WHERE role = 'OPERADOR'
UNION ALL
SELECT 
    '👨‍⚕️ MÉDICOS' as categoria,
    COUNT(*) as cantidad
FROM users WHERE role = 'MEDICO'
UNION ALL
SELECT 
    '🧑‍🤝‍🧑 PACIENTES' as categoria,
    COUNT(*) as cantidad
FROM users WHERE role = 'PACIENTE'
UNION ALL
SELECT 
    '🏥 CONSULTORIOS' as categoria,
    COUNT(*) as cantidad
FROM consultorio
UNION ALL
SELECT 
    '🤝 STAFF MÉDICO' as categoria,
    COUNT(*) as cantidad
FROM staff_medico;

-- Ver detalle de usuarios por centro
SELECT 
    COALESCE(ca.nombre, 'SIN CENTRO (GLOBAL)') as centro,
    u.role as rol,
    u.email,
    u.nombre || ' ' || u.apellido as nombre_completo
FROM users u
LEFT JOIN centro_atencion ca ON u.centro_atencion_id = ca.id
ORDER BY ca.id NULLS FIRST, u.role, u.email;