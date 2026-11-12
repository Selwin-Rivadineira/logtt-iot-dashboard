import React, { useState } from 'react';
import { eliminarUsuario } from '../../services/tarjetasService';
import { getSupabaseClient } from '../../services/supabaseClient';

export default function UserDeleteModal({ isOpen, onClose, usuario, onRefresh }) {
  const [eliminando, setEliminando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !usuario) return null;

  const handleDelete = async () => {
    setErrorMsg('');
    try {
      setEliminando(true);
      const client = getSupabaseClient();
      await eliminarUsuario(client, usuario.id);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al eliminar el usuario.');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container wireframe-target" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff4b4b', letterSpacing: '0.5px' }}>ADVERTENCIA</span>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Eliminar Usuario</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        {errorMsg && <div className="modal-alert alert-error" style={{ margin: '15px 24px 0' }}>{errorMsg}</div>}

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <p style={{ color: '#334155', fontSize: '15px', lineHeight: '1.5', margin: 0 }}>
            ¿Estás seguro de que deseas eliminar al usuario <strong>{usuario.nombre_completo}</strong>?
          </p>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '10px' }}>
            Esta acción es permanente y no se puede deshacer.
          </p>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '15px 24px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={eliminando} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleDelete} disabled={eliminando} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#ff4b4b', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
            {eliminando ? 'Eliminando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}