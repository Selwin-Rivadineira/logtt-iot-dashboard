import React, { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  normalizarUID,
  validarFormatoUID,
  buscarUsuarioPorNombre,
  registrarTarjeta,
  actualizarTarjeta
} from '../../services/tarjetasService';

export default function CardRegisterModal({
  isOpen,
  onClose,
  onSuccess,
  initialUid = '',
  initialAreaId = '',
  usuarios = [],
  areas = [],
  permisos = [],
  tarjetaAEditar = null
}) {
  const isEditing = !!tarjetaAEditar; 
  const [uid, setUid] = useState(initialUid);
  const [zonasIds, setZonasIds] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [esLlaveMaestra, setEsLlaveMaestra] = useState(false);
  const [estaActiva, setEstaActiva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const prevIsOpenRef = useRef(false);

  // Inicializar o restablecer al abrir
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (isEditing) {
        // SI EDITAMOS
        setUid(tarjetaAEditar.codigo_rfid || '');
        const titular = usuarios.find((u) => u.id === tarjetaAEditar.usuario_id);
        setNombreUsuario(titular?.nombre_completo || (tarjetaAEditar.usuario_id ? `Usuario #${tarjetaAEditar.usuario_id}` : ''));
        setEsLlaveMaestra(tarjetaAEditar.es_llave_maestra || false);
        setEstaActiva(tarjetaAEditar.esta_activa !== undefined ? tarjetaAEditar.esta_activa : true);
        
        // Obtener permisos del usuario desde la tabla 'permiso'
        const titularId = tarjetaAEditar.usuario_id;
        const permisosUsuario = permisos
          .filter((p) => p.usuario_id === titularId && p.esta_activo !== false)
          .map((p) => p.area_id);

        if (permisosUsuario.length > 0) {
          setZonasIds(permisosUsuario);
        } else if (tarjetaAEditar.area_id) {
          setZonasIds([tarjetaAEditar.area_id]);
        } else {
          setZonasIds([]);
        }
      } else {
        // SI CREAMOS
        setUid(initialUid ? normalizarUID(initialUid) : '');
        const defaultArea = initialAreaId
          ? parseInt(initialAreaId, 10)
          : areas[0]?.id
          ? areas[0].id
          : null;
        setZonasIds(defaultArea ? [defaultArea] : []);
        setNombreUsuario('');
        setEsLlaveMaestra(false);
        setEstaActiva(true);
      }
      setErrorMsg('');
      setSuccessMsg('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialUid, initialAreaId, usuarios, areas, permisos, tarjetaAEditar, isEditing]);

  // Alternar selección de una zona específica
  const toggleZona = (id) => {
    const idNum = parseInt(id, 10);
    if (zonasIds.includes(idNum)) {
      setZonasIds(zonasIds.filter((z) => z !== idNum));
    } else {
      setZonasIds([...zonasIds, idNum]);
    }
  };

  // Manejar cambio en Llave Maestra
  const handleMasterChange = (checked) => {
    setEsLlaveMaestra(checked);
    if (checked) {
      setZonasIds(areas.map((a) => a.id));
    } else {
      const defaultArea = initialAreaId
        ? parseInt(initialAreaId, 10)
        : areas[0]?.id
        ? areas[0].id
        : null;
      setZonasIds(defaultArea ? [defaultArea] : []);
    }
  };

  // Guardar tarjeta
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validacion = validarFormatoUID(uid);
    if (!validacion.valido) {
      setErrorMsg(validacion.error);
      return;
    }

    if (!esLlaveMaestra && zonasIds.length === 0) {
      setErrorMsg('Por favor seleccione al menos una Zona / Área autorizada para la tarjeta.');
      return;
    }

    const nombreTrim = (nombreUsuario || '').trim();
    if (!nombreTrim) {
      setErrorMsg('Por favor ingrese el nombre del titular para la tarjeta.');
      return;
    }

    setGuardando(true);
    const client = getSupabaseClient();
    try {
      // 1. Resolver usuario titular (usando coincidencia flexible: exacta, parcial o por palabras)
      let resolvedUsuarioId = null;

      const usuarioLocal = buscarUsuarioPorNombre(usuarios, nombreTrim);
      if (usuarioLocal) {
        resolvedUsuarioId = usuarioLocal.id;
      }

      // 2. Si no se encontró en la lista local, buscar en Supabase
      if (!resolvedUsuarioId && client) {
        try {
          const { data: usuarioRemoto } = await client
            .from('usuario')
            .select('id, nombre_completo')
            .ilike('nombre_completo', `%${nombreTrim}%`)
            .maybeSingle();

          if (usuarioRemoto?.id) {
            resolvedUsuarioId = usuarioRemoto.id;
          } else {
            // Intentar con la primera palabra (ej. "thomas")
            const primerPalabra = nombreTrim.split(/\s+/)[0];
            if (primerPalabra && primerPalabra.length >= 3) {
              const { data: usuarioPorPrimerNombre } = await client
                .from('usuario')
                .select('id, nombre_completo')
                .ilike('nombre_completo', `%${primerPalabra}%`)
                .maybeSingle();
              if (usuarioPorPrimerNombre?.id) {
                resolvedUsuarioId = usuarioPorPrimerNombre.id;
              }
            }
          }
        } catch (e) {
          console.warn('[LOGTT] Error buscando usuario remoto:', e);
        }
      }

      // 3. Si no existe aún y se requiere crear nuevo usuario:
      if (!resolvedUsuarioId && client) {
        try {
          const { data: nuevoU, error: errInsertAuto } = await client
            .from('usuario')
            .insert([{ nombre_completo: nombreTrim, rol: 'Operador' }])
            .select()
            .single();

          if (!errInsertAuto && nuevoU?.id) {
            resolvedUsuarioId = nuevoU.id;
          } else if (errInsertAuto?.message?.includes('violates row-level security policy')) {
            throw new Error(
              `La base de datos tiene restringida la creación de usuarios públicos (RLS). Para agregar titulares nuevos, ejecuta el script SQL de permisos en Supabase o selecciona un usuario existente (ej. Thomas Mamani, Lukas Quiroga).`
            );
          } else {
            const maxId = usuarios.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
            const nextId = maxId + 1;
            const { data: nuevoConId, error: errConId } = await client
              .from('usuario')
              .insert([{ id: nextId, nombre_completo: nombreTrim, rol: 'Operador' }])
              .select()
              .single();

            if (errConId) {
              if (errConId.message?.includes('violates row-level security policy')) {
                throw new Error(
                  `La base de datos tiene restringida la creación de usuarios públicos (RLS). Para agregar titulares nuevos, ejecuta el script SQL de permisos en Supabase o selecciona un usuario existente.`
                );
              }
              throw errConId;
            }
            resolvedUsuarioId = nuevoConId?.id || nextId;
          }
        } catch (errCrear) {
          console.warn('[LOGTT] Error registrando titular nuevo:', errCrear);
          throw errCrear;
        }
      }

      const finalZonas = esLlaveMaestra ? areas.map((a) => a.id) : zonasIds;
      const primaryAreaId = finalZonas[0] || null;

      if (isEditing) {
        await actualizarTarjeta(client, validacion.normalizado, {
          usuarioId: resolvedUsuarioId,
          zonasIds: finalZonas,
          esLlaveMaestra,
          estaActiva,
        });
        setSuccessMsg(`Tarjeta ${validacion.normalizado} actualizada exitosamente.`);
      } else {
        await registrarTarjeta(client, {
          codigoRfid: validacion.normalizado,
          usuarioId: resolvedUsuarioId,
          areaId: primaryAreaId,
          zonasIds: finalZonas,
          esLlaveMaestra,
          estaActiva,
        });
        setSuccessMsg(`Tarjeta ${validacion.normalizado} registrada exitosamente por zona.`);
      }
      setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 900);
    } catch (err) {
      if (err.status === 409) {
        setErrorMsg(`Conflicto (409): ${err.message}`);
      } else {
        setErrorMsg(err.message || 'Error al registrar la tarjeta.');
      }
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container wireframe-target"
        data-figma-label="Modal: Registro_Tarjeta"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="section-badge-tag">Gestión de Acceso</span>
            <h2>{isEditing ? 'Editar Tarjeta RFID' : 'Registrar Tarjeta RFID'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            &times;
          </button>
        </div>

        {/* Mensajes de Alerta */}
        {errorMsg && <div className="modal-alert alert-error">{errorMsg}</div>}
        {successMsg && <div className="modal-alert alert-success">{successMsg}</div>}

        <div className="modal-body">
          <form onSubmit={handleSubmit} className="card-form">
            {/* Campo 1: UID RFID */}
            <div className="form-group">
              <label>Código RFID (UID):</label>
              <input
                type="text"
                placeholder="Ej. 01020304 o A1B2C3D4"
                value={uid}
                onChange={(e) => setUid(normalizarUID(e.target.value))}
                required
                autoFocus
              />
              <span className="field-hint">
                Hexadecimal sin espacios ni símbolos (ej. 8 o 14 dígitos: 01020304).
              </span>
            </div>

            {/* Campo 2: Caja de checkboxes para selección de Zona(s) */}
            <div className="form-group">
              <label>Zona(s) / Área(s) Autorizada(s):</label>
              <div className="zones-checkbox-grid">
                {areas.map((a) => {
                  const isChecked = esLlaveMaestra || zonasIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className={`zone-checkbox-item ${isChecked ? 'checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={esLlaveMaestra}
                        onChange={() => toggleZona(a.id)}
                      />
                      <span className="zone-label-text">
                        <strong>{a.nombre}</strong>
                        {a.descripcion && (
                          <small className="zone-desc-text">{a.descripcion}</small>
                        )}
                      </span>
                    </label>
                  );
                })}
                {areas.length === 0 && (
                  <span style={{ fontSize: 12, color: '#94a3b8', padding: '6px' }}>
                    No hay áreas registradas en el sistema.
                  </span>
                )}
              </div>
              <span className="field-hint">
                Marca la(s) zona(s) físicas donde esta tarjeta tendrá permiso de acceso.
              </span>
            </div>

            {/* Campo 3: Nombre de Usuario */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Nombre de Usuario:</label>
              <input
                type="text"
                placeholder="Ej. Lukas Quiroga o nuevo titular"
                value={nombreUsuario}
                autoComplete="off"
                onChange={(e) => {
                  setNombreUsuario(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                required
                style={{ width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}
              />
              
              {/* Texto de ayuda ubicado debajo */}
              <span className="field-hint" style={{ display: 'block', marginTop: '8px', position: 'relative', zIndex: 0 }}>
                Titular responsable de la credencial (la autorización depende de las zonas seleccionadas arriba).
              </span>

              {/* Menú desplegable pegado al input */}
              {showDropdown && (
                <ul style={{
                  position: 'absolute',
                  top: '68px', 
                  left: 0,
                  width: '100%',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  color: '#333333',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  borderRadius: '0 0 4px 4px',
                  border: '1px solid #cccccc',
                  borderTop: 'none',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  zIndex: 1000
                }}>
                  {usuarios
                    .filter((u) => u.nombre_completo.toLowerCase().includes(nombreUsuario.toLowerCase()))
                    .map((u) => (
                      <li
                        key={u.id}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Evita que el input pierda el foco antes de tiempo
                          setNombreUsuario(u.nombre_completo);
                          setShowDropdown(false);
                        }}
                        style={{ 
                          padding: '10px 15px', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid #eeeeee',
                          fontSize: '14px',
                          margin: 0,
                          backgroundColor: '#ffffff',
                          transition: 'background-color 0.1s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e2e8f0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                        }}
                      >
                        {u.nombre_completo}
                      </li>
                    ))}
                  {usuarios.filter((u) => u.nombre_completo.toLowerCase().includes(nombreUsuario.toLowerCase())).length === 0 && (
                    <li style={{ padding: '10px 15px', color: '#64748b', fontSize: '14px', fontStyle: 'italic', margin: 0, backgroundColor: '#ffffff' }}>
                      Nuevo titular será creado...
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Checkboxes de configuración */}
            <div className="form-row-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={esLlaveMaestra}
                  onChange={(e) => handleMasterChange(e.target.checked)}
                />
                <span>Asignar como Llave Maestra Global (Todas las Zonas)</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={estaActiva}
                  onChange={(e) => setEstaActiva(e.target.checked)}
                />
                <span>Tarjeta Activa</span>
              </label>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={guardando || !uid || !nombreUsuario.trim() || (!esLlaveMaestra && zonasIds.length === 0)}
              >
                {guardando ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Confirmar Registro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
