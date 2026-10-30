import { createClient } from '@supabase/supabase-js';

// Obtener credenciales desde variables de entorno de Vite o localStorage
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const localUrl = localStorage.getItem('logtt_supabase_url');
  const localKey = localStorage.getItem('logtt_supabase_anon_key');

  const url = localUrl || envUrl;
  const key = localKey || envKey;

  return { url, key };
};

export const saveSupabaseConfig = (url, key) => {
  if (url) localStorage.setItem('logtt_supabase_url', url);
  if (key) localStorage.setItem('logtt_supabase_anon_key', key);
};

// Cliente dinámico de Supabase
export const getSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error('Error al instanciar cliente de Supabase:', err);
    return null;
  }
};
