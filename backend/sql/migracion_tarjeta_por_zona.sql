-- =====================================================================
-- LOGTT IoT Dashboard - Migración: Selección de Tarjetas por Zona
-- Proyecto: azsjsofedwlgelcdpmpi
-- Ejecutar en: https://supabase.com/dashboard/project/azsjsofedwlgelcdpmpi/sql/new
-- =====================================================================
-- Este script permite asignar tarjetas RFID por ZONA (área física) y no por rol:
-- 1. Agrega la columna 'area_id' a la tabla 'tarjeta' (referencia a 'area').
-- 2. Habilita permisos y políticas RLS para lectura, inserción y actualización
--    tanto en 'tarjeta' como en 'permiso'.
-- 3. Asocia las tarjetas existentes con sus respectivas zonas.
-- =====================================================================

-- PASO 1: Agregar columna 'area_id' a la tabla 'tarjeta' si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tarjeta' AND column_name = 'area_id'
  ) THEN
    ALTER TABLE tarjeta ADD COLUMN area_id integer REFERENCES area(id) ON DELETE SET NULL;
  END IF;
END $$;

-- PASO 2: Otorgar privilegios a roles anon, authenticated y service_role
GRANT ALL ON TABLE tarjeta TO anon, authenticated, service_role;
GRANT ALL ON TABLE permiso TO anon, authenticated, service_role;
GRANT ALL ON TABLE area TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- PASO 3: Habilitar RLS en 'tarjeta' y 'permiso'
ALTER TABLE tarjeta ENABLE ROW LEVEL SECURITY;
ALTER TABLE permiso ENABLE ROW LEVEL SECURITY;

-- PASO 4: Políticas RLS para 'tarjeta' (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Lectura publica tarjeta" ON tarjeta;
CREATE POLICY "Lectura publica tarjeta"
  ON tarjeta FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Insercion publica tarjeta" ON tarjeta;
CREATE POLICY "Insercion publica tarjeta"
  ON tarjeta FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Actualizacion publica tarjeta" ON tarjeta;
CREATE POLICY "Actualizacion publica tarjeta"
  ON tarjeta FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- PASO 5: Políticas RLS para 'permiso' (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Lectura publica permiso" ON permiso;
CREATE POLICY "Lectura publica permiso"
  ON permiso FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Insercion publica permiso" ON permiso;
CREATE POLICY "Insercion publica permiso"
  ON permiso FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Actualizacion publica permiso" ON permiso;
CREATE POLICY "Actualizacion publica permiso"
  ON permiso FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Eliminacion publica permiso" ON permiso;
CREATE POLICY "Eliminacion publica permiso"
  ON permiso FOR DELETE TO anon, authenticated USING (true);

-- PASO 6: Asignar zona física a las tarjetas de ejemplo existentes
-- Llaves Maestras (acceso global a todas las zonas, area_id puede ser NULL o indicativo)
UPDATE tarjeta SET area_id = NULL, es_llave_maestra = true WHERE codigo_rfid IN ('01020304', 'A1B2C3D4');

-- Tarjetas asignadas a zonas específicas
UPDATE tarjeta SET area_id = 3 WHERE codigo_rfid = '73A2B19F' AND area_id IS NULL; -- Laboratorio (Este)
UPDATE tarjeta SET area_id = 2 WHERE codigo_rfid = '4E5F6A7B' AND area_id IS NULL; -- Datacenter (Sur)
UPDATE tarjeta SET area_id = 4 WHERE codigo_rfid = 'C8D9E0F1' AND area_id IS NULL; -- Almacén (Oeste)
UPDATE tarjeta SET area_id = 1 WHERE codigo_rfid = '11223344' AND area_id IS NULL; -- Acceso Principal (Norte)

-- PASO 7: Verificar estructura actualizada
SELECT 
  c.column_name, 
  c.data_type, 
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_name = 'tarjeta'
ORDER BY c.ordinal_position;

