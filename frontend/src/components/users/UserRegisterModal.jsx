import React, { useState } from 'react';
import { crearUsuario } from '../../services/tarjetasService';
import { getSupabaseClient } from '../../services/supabaseClient';

export default function UserRegisterModal({ isOpen, onClose, onRefresh }) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rol, setRol] = useState('Operador');
  const [estaActivo, setEstaActivo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nombreCompleto.trim()) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = getSupabaseClient();
      
      await crearUsuario(supabase, {
        nombre_completo: nombreCompleto.trim(),
        rol: rol,
        esta_activo: estaActivo
      });

      if (onRefresh) onRefresh();
      handleClose();
    } catch (error) {
      setErrorMsg(error.message || 'Ocurrió un error al guardar el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNombreCompleto('');
    setRol('Operador');
    setEstaActivo(true);
    setErrorMsg('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ff4b4b', letterSpacing: '0.5px' }}>GESTIÓN DE PERSONAL</span>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Registrar Nuevo Usuario</h2>
          </div>
          <button onClick={handleClose} style={{ background: '#ff4b4b', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            &times;
          </button>
        </div>

        <div>
          {errorMsg && (
            <div style={{ color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#334155' }}>
                NOMBRE COMPLETO:
              </label>
              <input
                type="text"
                placeholder="Ej. Lukas Quiroga"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#334155' }}>
                ROL EN EL SISTEMA:
              </label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              >
                <option value="Operador">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={estaActivo}
                  onChange={(e) => setEstaActivo(e.target.checked)}
                  style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ color: '#334155', fontWeight: 'bold', fontSize: '13px' }}>USUARIO ACTIVO</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
              <button type="button" onClick={handleClose} disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: 'bold', color: '#334155' }}>
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#ff4b4b', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                {isSubmitting ? 'Guardando...' : 'Guardar Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}