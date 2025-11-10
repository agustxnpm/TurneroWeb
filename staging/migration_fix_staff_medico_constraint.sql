-- Migration: Fix staff_medico_id to allow NULL values
-- Problema 1: La columna staff_medico_id tiene NOT NULL constraint
-- Problema 2: La FK constraint tiene ON UPDATE NO ACTION
-- Solución: Remover NOT NULL y recrear FK con ON UPDATE/DELETE SET NULL

BEGIN;

-- 1. Remover el NOT NULL constraint de la columna
ALTER TABLE turno 
    ALTER COLUMN staff_medico_id DROP NOT NULL;

-- 2. Eliminar la FK constraint existente
ALTER TABLE turno 
    DROP CONSTRAINT IF EXISTS fkqsxqfhww7gjosausq9opcb8k4;

-- 3. Recrear la FK constraint con ON UPDATE SET NULL y ON DELETE SET NULL
ALTER TABLE turno 
    ADD CONSTRAINT fkqsxqfhww7gjosausq9opcb8k4 
    FOREIGN KEY (staff_medico_id) 
    REFERENCES staff_medico(id) 
    ON UPDATE SET NULL 
    ON DELETE SET NULL;

COMMIT;

-- Verificación
-- SELECT tc.constraint_name, rc.update_rule, rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.referential_constraints rc
--     ON tc.constraint_name = rc.constraint_name
-- WHERE tc.table_name = 'turno'
--     AND tc.constraint_name = 'fkqsxqfhww7gjosausq9opcb8k4';
