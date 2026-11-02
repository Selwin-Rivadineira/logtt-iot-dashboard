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
  usuarios = [],
}) {
  const [uid, setUid] = useState(initialUid);
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
      setUsuarioId(usuarios[0]?.id ? String(usuarios[0].id) : '');
      setEsLlaveMaestra(false);
      setEstaActiva(true);
      setErrorMsg('');
      setSuccessMsg('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialUid, usuarios]);

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

    if (!usuarioId) {
      setErrorMsg('Por favor seleccione un titular para la tarjeta.');
      return;
    }

    setGuardando(true);
    const client = getSupabaseClient();
    try {
      await registrarTarjeta(client, {
        codigoRfid: validacion.normalizado,
        usuarioId,
        esLlaveMaestra,
        estaActiva,
      });

      setSuccessMsg(`Tarjeta ${validacion.normalizado} registrada exitosamente.`);
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
                    {u.nombre_completo} ({u.rol})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={esLlaveMaestra}
                  onChange={(e) => setEsLlaveMaestra(e.target.checked)}
                />
                <span>Asignar como Llave Maestra Global</span>
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
                disabled={guardando || !uid || !usuarioId}
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
