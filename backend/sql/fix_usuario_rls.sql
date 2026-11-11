-- =====================================================================
-- LOGTT IoT Dashboard - Habilitar Creación de Usuarios desde el Frontend
-- Ejecutar en: https://supabase.com/dashboard/project/azsjsofedwlgelcdpmpi/sql/new
-- =====================================================================

GRANT ALL ON TABLE usuario TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Insercion publica usuario" ON usuario;
CREATE POLICY "Insercion publica usuario"
  ON usuario FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Actualizacion publica usuario" ON usuario;
CREATE POLICY "Actualizacion publica usuario"
  ON usuario FOR UPDATE TO anon USING (true) WITH CHECK (true);

