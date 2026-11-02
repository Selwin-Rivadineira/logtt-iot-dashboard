// Solo clasifica el tipo: nunca devuelve ni registra el valor de la clave.
export function isServerOnlyKey(key = '') {
  const k = key.trim();
  // Nuevo formato de Supabase: prefijo explícito de clave secreta de servidor
  if (k.startsWith('sb_secret_')) return true;
  // Formato JWT clásico: decodificar payload y verificar rol
  try {
    const parts = k.split('.');
    if (parts.length === 3) {
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded.role === 'service_role';
    }
  } catch {
    // No es JWT, continuar
  }
  // Las claves sb_publishable_ son seguras para el frontend
  return false;
}

export function assertPublicEnvironment(env) {
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith('VITE_') && isServerOnlyKey(value)) {
      throw new Error(`${name} contiene una clave secreta de Supabase. Usa una clave publicable en el frontend y conserva la secreta solo en SUPABASE_SECRET_KEY, sin prefijo VITE_.`);
    }
  }
}
