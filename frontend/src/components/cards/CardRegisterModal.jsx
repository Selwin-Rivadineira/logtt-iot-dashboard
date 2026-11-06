import React, { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  normalizarUID,
  validarFormatoUID,
  registrarTarjeta,
} from '../../services/enrolamientoService';

export default function CardRegisterModal({
  isOpen,
  onClose,
  onSuccess,
  initialUid = '',
  initialAreaId = '',
  usuarios = [],
  areas = [],
}) {
  const [uid, setUid] = useState(initialUid);
  const [zonasIds, setZonasIds] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [esLlaveMaestra, setEsLlaveMaestra] = useState(false);
  const [estaActiva, setEstaActiva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const prevIsOpenRef = useRef(false);

  // Inicializar o restablecer al abrir
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setUid(initialUid ? normalizarUID(initialUid) : '');
      const defaultArea = initialAreaId
        ? parseInt(initialAreaId, 10)
        : areas[0]?.id
        ? areas[0].id
        : null;
      setZonasIds(defaultArea ? [defaultArea] : []);
      setUsuarioId(usuarios[0]?.id ? String(usuarios[0].id) : '');
      setEsLlaveMaestra(false);
      setEstaActiva(true);
      setErrorMsg('');
      setSuccessMsg('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialUid, initialAreaId, usuarios, areas]);

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

    if (!usuarioId) {
      setErrorMsg('Por favor seleccione un titular para la tarjeta.');
      return;
    }

    setGuardando(true);
    const client = getSupabaseClient();
    try {
      const finalZonas = esLlaveMaestra ? areas.map((a) => a.id) : zonasIds;
      const primaryAreaId = finalZonas[0] || null;

      await registrarTarjeta(client, {
        codigoRfid: validacion.normalizado,
        usuarioId,
        areaId: primaryAreaId,
        zonasIds: finalZonas,
        esLlaveMaestra,
        estaActiva,
      });

      setSuccessMsg(`Tarjeta ${validacion.normalizado} registrada exitosamente por zona.`);
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
            <h2>Registrar Tarjeta RFID</h2>
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

            {/* Campo 3: Usuario Titular (sin rol) */}
            <div className="form-group">
              <label>Usuario Titular:</label>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                required
              >
                <option value="">-- Seleccionar Titular --</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre_completo}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Titular responsable de la credencial (la autorización depende de las zonas seleccionadas arriba).
              </span>
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
                disabled={guardando || !uid || !usuarioId || (!esLlaveMaestra && zonasIds.length === 0)}
              >
                {guardando ? 'Guardando...' : 'Confirmar Registro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
