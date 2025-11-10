-- =================================================================================================
-- PASO 1: INSERTAR STAFF MEDICO PARA EL DR. JUAN PÉREZ EN EL CENTRO DE ATENCIÓN "ESPERANZA"
-- =================================================================================================
DO $$
DECLARE
    v_medico_id INT;
    v_especialidad_id INT;
    v_centro_atencion_id INT;
    v_consultorio_id INT;
    v_staff_medico_id INT := 99995; -- ID asignado manualmente
    v_disponibilidad_medico_id INT := 99994; -- ID asignado manualmente
    v_esquema_turno_id INT := 99993; -- ID asignado manualmente
BEGIN

    -- Obtenemos el ID del Dr. Juan Pérez usando su DNI
    SELECT id INTO v_medico_id FROM medico WHERE dni = 33333333;

    -- Obtenemos el ID de la especialidad 'Cardiología'
    SELECT id INTO v_especialidad_id FROM especialidad WHERE nombre = 'Cardiología';

    -- Obtenemos el ID del Centro de Atención 'Esperanza'
    -- Asegúrate de que este centro exista en tu tabla centro_atencion
    SELECT id INTO v_centro_atencion_id FROM centro_atencion WHERE nombre = 'Centro Médico Esperanza';

    -- Obtenemos el ID del consultorio DEL CENTRO ESPECÍFICO
    -- IMPORTANTE: Debe ser el Consultorio 1 que pertenece al Centro Médico Esperanza
    SELECT id INTO v_consultorio_id 
    FROM consultorio 
    WHERE nombre = 'Consultorio 1' 
      AND centro_atencion_id = v_centro_atencion_id;

    -- Insertamos en la tabla staff_medico con el ID manual
    INSERT INTO public.staff_medico (id, porcentaje, centro_atencion_id, consultorio_id, especialidad_id, medico_id)
    VALUES (v_staff_medico_id, 100, v_centro_atencion_id, v_consultorio_id, v_especialidad_id, v_medico_id);

-- =================================================================================================
-- PASO 2: GENERAR LA DISPONIBILIDAD PARA EL STAFF MÉDICO CREADO
-- =================================================================================================

    -- Insertamos la disponibilidad para el staff médico con el ID manual
    INSERT INTO public.disponibilidad_medico (id, especialidad_id, staff_medico_id)
    VALUES (v_disponibilidad_medico_id, v_especialidad_id, v_staff_medico_id);

    -- Insertamos los horarios de disponibilidad
    INSERT INTO public.disponibilidad_medico_horarios (disponibilidad_medico_id, dia, hora_fin, hora_inicio)
    VALUES
        (v_disponibilidad_medico_id, 'LUNES', '17:00:00', '10:00:00'),
        (v_disponibilidad_medico_id, 'MIERCOLES', '17:00:00', '10:00:00'),
        (v_disponibilidad_medico_id, 'VIERNES', '17:00:00', '10:00:00');

-- =================================================================================================
-- PASO 3: GENERAR EL ESQUEMA DE TURNOS CORRESPONDIENTE
-- =================================================================================================

    -- Creamos el esquema de turnos con el ID manual
    INSERT INTO public.esquema_turno (id, intervalo, centro_atencion_id, consultorio_id, disponibilidad_medico_id, staff_medico_id)
    VALUES (v_esquema_turno_id, 30, v_centro_atencion_id, v_consultorio_id, v_disponibilidad_medico_id, v_staff_medico_id);

    -- Insertamos los horarios para el esquema de turnos.
    INSERT INTO public.esquema_turno_horarios (esquema_turno_id, dia, hora_fin, hora_inicio)
    VALUES
        (v_esquema_turno_id, 'LUNES', '17:00:00', '10:00:00'),
        (v_esquema_turno_id, 'MIERCOLES', '17:00:00', '10:00:00'),
        (v_esquema_turno_id, 'VIERNES', '17:00:00', '10:00:00');

    RAISE NOTICE 'Script de esquema de turnos ejecutado exitosamente para el Dr. Juan Pérez.';

END $$;