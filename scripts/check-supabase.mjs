import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { TABLES } from '../src/dashboardSync.js';

const env = { ...loadEnv('development', process.cwd(), 'VITE_'), ...process.env };
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.');
  process.exitCode = 1;
} else {
  console.log(`Proyecto consultado: ${url}`);
  const client = createClient(url, key, { auth: { persistSession: false } });
  const results = await Promise.all(TABLES.map(async (table) => {
    const { count, error, status } = await client.from(table)
      .select('*', { head: true, count: 'exact' })
      .abortSignal(AbortSignal.timeout(15000));
    return { tabla: table, HTTP: status, filas_visibles: count, error: error?.message || '' };
  }));
  console.table(results);
  if (results.some((result) => result.error)) process.exitCode = 1;
  else if (results.every((result) => result.filas_visibles === 0)) {
    console.log('La API responde, pero no permite ver filas o las tablas están vacías. Si el editor muestra datos, revisa proyecto y políticas RLS con supabase/diagnostico_lectura.sql.');
  }
}
