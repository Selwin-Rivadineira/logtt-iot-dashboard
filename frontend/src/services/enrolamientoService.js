/**
 * Servicio de Validación y Registro de Tarjetas RFID
 * LOGTT IoT Dashboard
 */

/**
 * Normaliza un UID eliminando espacios, guiones o dos puntos y convirtiéndolo a mayúsculas.
 * Ejemplos: "01:02:03:04" -> "01020304", " a1-b2-c3-d4 " -> "A1B2C3D4"
 */
export function normalizarUID(uid) {
  if (!uid || typeof uid !== 'string') return '';
  return uid.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
}

/**
 * Valida el formato del UID (hexadecimal de entre 4 y 28 caracteres).
 */
export function validarFormatoUID(uid) {
  const normalizado = normalizarUID(uid);
  if (!normalizado) {
    return { valido: false, error: 'El código UID no puede estar vacío.' };
  }
  if (!/^[0-9A-F]{4,28}$/.test(normalizado)) {
    return {
      valido: false,
      error: 'Formato de UID inválido. Debe contener caracteres hexadecimales (0-9, A-F) sin espacios.',
    };
  }
  if (normalizado.length % 2 !== 0) {
    return {
      valido: false,
      error: 'Longitud de UID inválida. Debe tener un número par de dígitos hexadecimales (ej. 8 o 14 caracteres).',
    };
  }
  return { valido: true, normalizado };
}

/**
 * Registra una nueva tarjeta en el sistema.
 * Valida formato y rechaza duplicados con código 409.
 */
export async function registrarTarjeta(client, { codigoRfid, usuarioId, esLlaveMaestra = false, estaActiva = true }) {
  if (!client) throw new Error('Cliente de base de datos no disponible.');

  const validacion = validarFormatoUID(codigoRfid);
  if (!validacion.valido) {
    const err = new Error(validacion.error);
    err.status = 400;
    throw err;
  }
  const uidFinal = validacion.normalizado;

  if (!usuarioId) {
    const err = new Error('Debe seleccionar o asignar un usuario titular para la tarjeta.');
    err.status = 400;
    throw err;
  }

  // 1. Comprobar si el UID ya existe
  const { data: tarjetaExistente, error: errorBusqueda } = await client
    .from('tarjeta')
    .select('codigo_rfid, usuario_id')
    .eq('codigo_rfid', uidFinal)
    .maybeSingle();

  if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
    throw new Error(`Error verificando tarjeta: ${errorBusqueda.message}`);
  }

  if (tarjetaExistente) {
    const err = new Error(`El código RFID ${uidFinal} ya está registrado en el sistema.`);
    err.status = 409;
    throw err;
  }

  // 2. Insertar en la tabla 'tarjeta'
  const { data: nuevaTarjeta, error: errorInsert } = await client
    .from('tarjeta')
    .insert([
      {
        codigo_rfid: uidFinal,
        usuario_id: parseInt(usuarioId, 10),
        es_llave_maestra: Boolean(esLlaveMaestra),
        esta_activa: Boolean(estaActiva),
      },
    ])
    .select()
    .single();

  if (errorInsert) {
    if (errorInsert.code === '23505') {
      const err = new Error(`El código RFID ${uidFinal} ya existe en el sistema (conflicto de clave única).`);
      err.status = 409;
      throw err;
    }
    throw new Error(`Error al guardar la tarjeta: ${errorInsert.message}`);
  }

  return nuevaTarjeta;
}
