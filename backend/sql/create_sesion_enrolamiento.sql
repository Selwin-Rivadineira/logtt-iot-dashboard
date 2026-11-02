-- =====================================================================
-- HABILITAR PERMISOS COMPLETOS RLS PARA ENROLAMIENTO Y TARJETAS
-- Proyecto: azsjsofedwlgelcdpmpi
-- Ejecutar en: https://supabase.com/dashboard/project/azsjsofedwlgelcdpmpi/sql/new
-- =====================================================================

-- 1. Permisos a nivel de tabla y secuencias en PostgreSQL
GRANT ALL ON TABLE sesion_enrolamiento TO anon, authenticated, service_role;
GRANT ALL ON TABLE tarjeta TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Asegurar RLS habilitado
ALTER TABLE sesion_enrolamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarjeta ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas existentes de sesion_enrolamiento
DROP POLICY IF EXISTS "Acceso total sesion_enrolamiento" ON sesion_enrolamiento;
DROP POLICY IF EXISTS "Lectura sesion_enrolamiento" ON sesion_enrolamiento;
DROP POLICY IF EXISTS "Insercion sesion_enrolamiento" ON sesion_enrolamiento;
DROP POLICY IF EXISTS "Actualizacion sesion_enrolamiento" ON sesion_enrolamiento;

-- 4. Política integral (SELECT, INSERT, UPDATE, DELETE) para sesion_enrolamiento
CREATE POLICY "Acceso total sesion_enrolamiento"
  ON sesion_enrolamiento
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Políticas de inserción y actualización para registrar tarjetas
DROP POLICY IF EXISTS "Insercion publica tarjeta" ON tarjeta;
CREATE POLICY "Insercion publica tarjeta"
  ON tarjeta
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Actualizacion publica tarjeta" ON tarjeta;
CREATE POLICY "Actualizacion publica tarjeta"
  ON tarjeta
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Habilitar publicación en Realtime para sesion_enrolamiento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'sesion_enrolamiento'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sesion_enrolamiento;
  END IF;
END $$;
