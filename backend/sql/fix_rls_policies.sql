-- =====================================================================
-- LOGTT IoT Dashboard - Script de Corrección de Políticas RLS
-- Ejecutar en: https://supabase.com/dashboard/project/azsjsofedwlgelcdpmpi/sql/new
-- Este script RECREA las políticas de lectura pública para el rol 'anon'
-- =====================================================================

-- PASO 1: Limpiar políticas existentes (si hay duplicadas o incorrectas)
DROP POLICY IF EXISTS "Lectura publica historial_acceso" ON historial_acceso;
DROP POLICY IF EXISTS "Insercion publica historial_acceso" ON historial_acceso;
DROP POLICY IF EXISTS "Lectura publica area" ON area;
DROP POLICY IF EXISTS "Lectura publica usuario" ON usuario;
DROP POLICY IF EXISTS "Lectura publica tarjeta" ON tarjeta;
DROP POLICY IF EXISTS "Lectura publica permiso" ON permiso;

-- PASO 2: Habilitar RLS en todas las tablas
ALTER TABLE historial_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE area ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarjeta ENABLE ROW LEVEL SECURITY;
ALTER TABLE permiso ENABLE ROW LEVEL SECURITY;

-- PASO 3: Crear políticas de SELECT para el rol 'anon' (sin autenticación)
CREATE POLICY "Lectura publica historial_acceso"
  ON historial_acceso FOR SELECT TO anon USING (true);

CREATE POLICY "Insercion publica historial_acceso"
  ON historial_acceso FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Lectura publica area"
  ON area FOR SELECT TO anon USING (true);

CREATE POLICY "Lectura publica usuario"
  ON usuario FOR SELECT TO anon USING (true);

CREATE POLICY "Lectura publica tarjeta"
  ON tarjeta FOR SELECT TO anon USING (true);

CREATE POLICY "Insercion publica tarjeta"
  ON tarjeta FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Actualizacion publica tarjeta"
  ON tarjeta FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Lectura publica permiso"
  ON permiso FOR SELECT TO anon USING (true);

CREATE POLICY "Insercion publica permiso"
  ON permiso FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Actualizacion publica permiso"
  ON permiso FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- PASO 4: Verificar que el rol 'anon' puede leer las tablas
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_habilitado,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_puede_leer
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('historial_acceso', 'area', 'usuario', 'tarjeta', 'permiso');

-- PASO 5: Contar filas visibles con rol 'anon' (simulación del dashboard)
BEGIN;
SET LOCAL ROLE anon;
SELECT 'historial_acceso' AS tabla, count(*) AS filas_visibles FROM public.historial_acceso
UNION ALL SELECT 'area',    count(*) FROM public.area
UNION ALL SELECT 'usuario', count(*) FROM public.usuario
UNION ALL SELECT 'tarjeta', count(*) FROM public.tarjeta
UNION ALL SELECT 'permiso', count(*) FROM public.permiso;
ROLLBACK;

-- PASO 6: Habilitar Realtime para historial_acceso (para actualizaciones en tiempo real)
-- Si da error "already member", ignorarlo, ya está habilitado.
ALTER PUBLICATION supabase_realtime ADD TABLE historial_acceso;
