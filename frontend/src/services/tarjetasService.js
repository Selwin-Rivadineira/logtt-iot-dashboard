/**
 * Servicio de Validación y Registro de Tarjetas RFID
 * LOGTT IoT Dashboard
 * Asignación por Zona / Área física
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
 * Busca de forma flexible un usuario por nombre, permitiendo coincidencias
 * exactas, parciales (ej. "thomas Mamani Condarco" -> "Thomas Mamani") o por palabras.
 */
export function buscarUsuarioPorNombre(usuarios = [], nombre = '') {
  if (!nombre || typeof nombre !== 'string') return null;
  const limpio = nombre.trim().toLowerCase();
  if (!limpio) return null;

  // 1. Coincidencia exacta (insensible a mayúsculas y espacios extra)
  const exacto = usuarios.find(
    (u) => u?.nombre_completo && u.nombre_completo.trim().toLowerCase() === limpio
  );
  if (exacto) return exacto;

  // 2. Si es formato numérico o #ID
  if (/^#?\d+$/.test(limpio)) {
    const idNum = parseInt(limpio.replace('#', ''), 10);
    const porId = usuarios.find((u) => u?.id === idNum);
    if (porId) return porId;
  }

  // 3. Contención directa (si el texto ingresado contiene el nombre del usuario o viceversa)
  const porContencion = usuarios.find((u) => {
    if (!u?.nombre_completo) return false;
    const uNom = u.nombre_completo.trim().toLowerCase();
    return limpio.includes(uNom) || uNom.includes(limpio);
  });
  if (porContencion) return porContencion;

  // 4. Coincidencia por conjunto de palabras (ej. coinciden nombre y primer apellido)
  const palabrasInput = limpio.split(/\s+/).filter((p) => p.length >= 3);
  let mejorCandidato = null;
  let maxCoincidencias = 0;

  for (const u of usuarios) {
    if (!u?.nombre_completo) continue;
    const palabrasU = u.nombre_completo.trim().toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    const coincidencias = palabrasU.filter((w) => palabrasInput.includes(w)).length;
    if (coincidencias > maxCoincidencias && coincidencias >= Math.min(2, palabrasU.length)) {
      maxCoincidencias = coincidencias;
      mejorCandidato = u;
    }
  }

  return mejorCandidato;
}

/**
 * Registra una nueva tarjeta en el sistema vinculada a una o varias ZONAS (Áreas).
 * Valida formato, rechaza duplicados con código 409 y asocia la zona en 'tarjeta' y 'permiso'.
 */
export async function registrarTarjeta(
  client,
  {
    codigoRfid,
    usuarioId,
    areaId = null,
    zonasIds = [],
    esLlaveMaestra = false,
    estaActiva = true,
  }
) {
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

  // Normalizar lista de zonas seleccionadas
  let zonasNormalizadas = Array.isArray(zonasIds)
    ? zonasIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id) && id > 0)
    : [];

  if (areaId !== null && areaId !== undefined && areaId !== '') {
    const parsedArea = parseInt(areaId, 10);
    if (!isNaN(parsedArea) && parsedArea > 0 && !zonasNormalizadas.includes(parsedArea)) {
      zonasNormalizadas.unshift(parsedArea);
    }
  }

  // Si no es llave maestra global, debe especificarse al menos una zona autorizada
  if (!esLlaveMaestra && zonasNormalizadas.length === 0) {
    const err = new Error('Debe seleccionar al menos una zona o punto de acceso para la tarjeta.');
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

  const primaryAreaId = zonasNormalizadas.length > 0 ? zonasNormalizadas[0] : null;

  // 2. Insertar en la tabla 'tarjeta' (incluyendo area_id si está disponible)
  const payloadTarjeta = {
    codigo_rfid: uidFinal,
    usuario_id: parseInt(usuarioId, 10),
    es_llave_maestra: Boolean(esLlaveMaestra),
    esta_activa: Boolean(estaActiva),
  };

  if (primaryAreaId !== null) {
    payloadTarjeta.area_id = primaryAreaId;
  }

  let nuevaTarjeta;
  const { data: insertResult, error: errorInsert } = await client
    .from('tarjeta')
    .insert([payloadTarjeta])
    .select()
    .single();

  if (errorInsert) {
    // Si la columna area_id aún no ha sido agregada en Supabase, reintentar sin area_id
    if (errorInsert.message && errorInsert.message.includes('area_id')) {
      delete payloadTarjeta.area_id;
      const { data: fallbackResult, error: fallbackError } = await client
        .from('tarjeta')
        .insert([payloadTarjeta])
        .select()
        .single();

      if (fallbackError) {
        if (fallbackError.code === '23505') {
          const err = new Error(`El código RFID ${uidFinal} ya existe en el sistema (conflicto de clave única).`);
          err.status = 409;
          throw err;
        }
        throw new Error(`Error al guardar la tarjeta: ${fallbackError.message}`);
      }
      nuevaTarjeta = fallbackResult;
    } else if (errorInsert.code === '23505') {
      const err = new Error(`El código RFID ${uidFinal} ya existe en el sistema (conflicto de clave única).`);
      err.status = 409;
      throw err;
    } else {
      throw new Error(`Error al guardar la tarjeta: ${errorInsert.message}`);
    }
  } else {
    nuevaTarjeta = insertResult;
  }

  // 3. Sincronizar permisos en la tabla 'permiso' para las zonas seleccionadas
  if (zonasNormalizadas.length > 0) {
    try {
      const { data: existingPermisos } = await client
        .from('permiso')
        .select('area_id')
        .eq('usuario_id', parseInt(usuarioId, 10));

      const existingSet = new Set((existingPermisos || []).map((p) => p.area_id));
      const permisosParaInsertar = zonasNormalizadas
        .filter((aid) => !existingSet.has(aid))
        .map((aid) => ({
          usuario_id: parseInt(usuarioId, 10),
          area_id: aid,
          esta_activo: true,
        }));

      if (permisosParaInsertar.length > 0) {
        await client.from('permiso').insert(permisosParaInsertar);
      }
    } catch (errPermiso) {
      console.warn('[LOGTT] No se pudo sincronizar permisos en tabla permiso:', errPermiso.message);
    }
  }

  return {
    ...nuevaTarjeta,
    area_id: nuevaTarjeta?.area_id ?? primaryAreaId,
    zonas: zonasNormalizadas,
  };
}
// NUEVAS FUNCIONES PARA COMPLETAR EL CRUD
export async function actualizarTarjeta(client, codigoRfid, datosActualizados) {
  if (!client || !codigoRfid) throw new Error('Cliente o código RFID faltante.');
  
  const uId = parseInt(datosActualizados.usuarioId, 10);
  const payloadUpdate = {
    usuario_id: uId,
    es_llave_maestra: Boolean(datosActualizados.esLlaveMaestra),
    esta_activa: Boolean(datosActualizados.estaActiva),
  };

  // 1. Actualizar campos de la tabla 'tarjeta' (sin forzar area_id, ya que las zonas residen en 'permiso')
  const { data, error } = await client
    .from('tarjeta')
    .update(payloadUpdate)
    .eq('codigo_rfid', codigoRfid)
    .select()
    .single();

  if (error) throw new Error(`Error al actualizar tarjeta: ${error.message}`);

  // 2. Sincronizar permisos en la tabla 'permiso' para las zonas seleccionadas
  if (datosActualizados.zonasIds && Array.isArray(datosActualizados.zonasIds)) {
    try {
      const zonasDeseadas = datosActualizados.zonasIds
        .map((id) => parseInt(id, 10))
        .filter((aid) => !isNaN(aid) && aid > 0);

      const { data: existingPermisos } = await client
        .from('permiso')
        .select('area_id')
        .eq('usuario_id', uId);

      const existingAreas = (existingPermisos || []).map((p) => p.area_id);

      // Permisos a insertar (nuevas zonas autorizadas en la tabla permiso)
      const permisosParaInsertar = zonasDeseadas
        .filter((aid) => !existingAreas.includes(aid))
        .map((aid) => ({
          usuario_id: uId,
          area_id: aid,
          esta_activo: true,
        }));

      if (permisosParaInsertar.length > 0) {
        await client.from('permiso').insert(permisosParaInsertar);
      }

      // Permisos a remover (zonas desmarcadas en la tabla permiso)
      const areasParaRemover = existingAreas.filter((aid) => !zonasDeseadas.includes(aid));
      if (areasParaRemover.length > 0) {
        for (const aid of areasParaRemover) {
          await client
            .from('permiso')
            .delete()
            .eq('usuario_id', uId)
            .eq('area_id', aid);
        }
      }
    } catch (errPermiso) {
      console.warn('[LOGTT] Error sincronizando permisos en tabla permiso al actualizar:', errPermiso.message);
    }
  }

  return data;
}

export async function eliminarTarjeta(client, codigoRfid) {
  if (!client || !codigoRfid) throw new Error('Cliente o código RFID faltante.');
  const { error } = await client.from('tarjeta').delete().eq('codigo_rfid', codigoRfid);
  if (error) throw new Error(`Error al eliminar: ${error.message}`);
  return true;
}