import { createClient } from '@supabase/supabase-js';
import { isServerOnlyKey } from './supabaseKey';

// URL y Clave pública de Supabase
export const DEFAULT_SUPABASE_URL = 'https://azsjsofedwlgelcdpmpi.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6c2pzb2ZlZHdsZ2VsY2RwbXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4ODA0NDMsImV4cCI6MjEwNjQ1NjQ0M30.muaEIcUt_CsFul2BXG9mmtuqtWQX1eMUFb6IN4L8Fjc';

// Verifica si la clave es JWT clásico (eyJ...) o el nuevo formato sb_publishable_
const isJwtKey = (key = '') => key.trim().startsWith('eyJ');

// Obtener credenciales desde variables de entorno de Vite, localStorage o valores por defecto
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  // Usar siempre un par del mismo origen. Una configuración antigua del
  // navegador no debe sobrescribir el proyecto definido en .env/Vercel.
  if (envUrl || envKey) return { url: envUrl || '', key: envKey || '' };

  let localUrl;
  let localKey;
  try {
    localUrl = localStorage.getItem('logtt_supabase_url')?.trim();
    localKey = localStorage.getItem('logtt_supabase_anon_key')?.trim();
  } catch {
    // El navegador puede bloquear localStorage.
  }
  const url = localUrl && localKey ? localUrl : DEFAULT_SUPABASE_URL;
  const key = localUrl && localKey ? localKey : DEFAULT_SUPABASE_KEY;

  return { url, key };
};

export const saveSupabaseConfig = (url, key) => {
  if (isServerOnlyKey(key)) throw new Error('Usa una clave publicable de Supabase en la página.');
  if (url) localStorage.setItem('logtt_supabase_url', url);
  if (key) localStorage.setItem('logtt_supabase_anon_key', key);
};

let cachedClient;
let cachedUrl;
let cachedKey;

// Reutilizar el cliente HTTP y Realtime en todas las consultas.
export const getSupabaseClient = () => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key || isServerOnlyKey(key)) return null;

  // Advertir si la clave no es JWT (nuevo formato sb_publishable_)
  // El cliente @supabase/supabase-js necesita el JWT anon key para autenticarse
  if (!isJwtKey(key)) {
    console.warn(
      '[LOGTT] ⚠️ La VITE_SUPABASE_ANON_KEY parece ser del nuevo formato (sb_publishable_...) en lugar del JWT clásico (eyJhbGci...).\n' +
      'Si los datos no aparecen, ve a tu proyecto Supabase → Settings → API → y copia la clave \'anon\' / \'public\' que empieza con eyJhbGci... y ponla en VITE_SUPABASE_ANON_KEY en tu .env'
    );
  }

  if (cachedClient && url === cachedUrl && key === cachedKey) return cachedClient;
  try {
    cachedClient?.removeAllChannels();
    cachedClient = createClient(url, key, {
      auth: { persistSession: false },
    });
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Error al instanciar cliente de Supabase:', err);
    return null;
  }
};
