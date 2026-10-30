-- SOLO LECTURA. Ejecutar en el SQL Editor del proyecto configurado en .env.
-- No inserta datos, no desactiva RLS y no cambia permisos.

-- 1. Filas existentes con el rol del SQL Editor.
select 'historial_acceso' as tabla, count(*) as filas from public.historial_acceso
union all select 'area', count(*) from public.area
union all select 'usuario', count(*) from public.usuario
union all select 'tarjeta', count(*) from public.tarjeta
union all select 'permiso', count(*) from public.permiso;

-- 2. RLS y privilegios del rol usado por la web actual (anon).
select c.relname as tabla, c.relrowsecurity as rls_habilitado,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_tiene_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_tiene_select
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('historial_acceso', 'area', 'usuario', 'tarjeta', 'permiso');

-- 3. Las políticas deben autorizar SELECT al rol correspondiente.
select tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('historial_acceso', 'area', 'usuario', 'tarjeta', 'permiso')
order by tablename, policyname;

-- 4. Tablas que publican cambios. El sondeo de la web funciona sin Realtime.
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
  and tablename in ('historial_acceso', 'area', 'usuario', 'tarjeta', 'permiso');

-- 5. Comparar con lo que realmente puede leer una conexión sin sesión Auth.
begin;
set local role anon;
select 'historial_acceso' as tabla, count(*) as filas_visibles from public.historial_acceso
union all select 'area', count(*) from public.area
union all select 'usuario', count(*) from public.usuario
union all select 'tarjeta', count(*) from public.tarjeta
union all select 'permiso', count(*) from public.permiso;
rollback;
