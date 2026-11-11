import React, { useState } from 'react';
import { eliminarTarjeta } from '../../services/enrolamientoService'; 
import { getSupabaseClient } from '../../services/supabaseClient'; 

export default function CardsTable({
  tarjetas = [],
  usuarios = [],
  areas = [],
  permisos = [],
  getAreaObj,
  onOpenRegisterModal,
  onRefresh, // <-- NUEVO: Para actualizar la tabla al borrar
}) {
  // NUEVO: Estado para controlar el modal de eliminación
  const [tarjetaAEliminar, setTarjetaAEliminar] = useState(null);

  // Solo abre la ventana y guarda qué tarjeta seleccionamos
  const handleEliminar = (codigoRfid) => {
    setTarjetaAEliminar(codigoRfid);
  };

  // Función que se ejecuta si el usuario hace clic en "Confirmar"
  const confirmarEliminacion = async () => {
    if (!tarjetaAEliminar) return;
    try {
      const client = getSupabaseClient();
      await eliminarTarjeta(client, tarjetaAEliminar);
      if (onRefresh) onRefresh(); // Recarga los datos
      setTarjetaAEliminar(null); // Cierra la ventana
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  // Función que se ejecuta si hace clic en "Cancelar"
  const cancelarEliminacion = () => {
    setTarjetaAEliminar(null);
  };

  const getZonaLabel = (t) => {
    if (t.es_llave_maestra) {
      return <span className="zone-tag-master">★ Todas las Zonas (Llave Maestra)</span>;
    }
    if (t.area_id) {
      const area = getAreaObj ? getAreaObj(t.area_id) : areas.find((a) => a.id === t.area_id);
      return area?.nombre || area?.descripcion || `Zona #${t.area_id}`;
    }
    // Si no tiene area_id directo, verificar en permisos por usuario
    const perms = permisos.filter((p) => p.usuario_id === t.usuario_id && p.esta_activo !== false);
    if (perms.length > 0) {
      return perms  
        .map((p) => {
          const a = getAreaObj ? getAreaObj(p.area_id) : areas.find((ar) => ar.id === p.area_id);
          return a?.nombre || `Zona ${p.area_id}`;
        })
        .join(', ');
    }
    return <span style={{ color: '#94a3b8' }}>Sin zona asignada</span>;
  };

  return (
    <div className="logs-container-box mb-20 wireframe-target" data-figma-label="Table: Tarjetas_RFID">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 15, margin: 0 }}>Tarjetas RFID & Zonas Asignadas</h3>
          <p className="section-desc" style={{ margin: '4px 0 0 0' }}>
            Credenciales autorizadas por zona física (control de acceso sin distinción por rol).
          </p>
        </div>
        {onOpenRegisterModal && (
          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: 13, padding: '7px 14px' }}
            onClick={() => onOpenRegisterModal()}
          >
            + Nueva Tarjeta
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead>
            <tr>
              <th>Código RFID (UID)</th>
              <th>Zona / Área Autorizada</th>
              <th>Titular Asignado</th>
              <th>Tipo de Acceso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tarjetas.map((t) => {
              const u = usuarios.find((usr) => usr.id === t.usuario_id);
              return (
                <tr key={t.codigo_rfid}>
                  <td>
                    <code>{t.codigo_rfid}</code>
                  </td>
                  <td>{getZonaLabel(t)}</td>
                  <td>{u ? u.nombre_completo : `Usuario #${t.usuario_id}`}</td>
                  <td>
                    <span className={t.es_llave_maestra ? 'text-rol-admin' : 'text-rol-user'}>
                      {t.es_llave_maestra ? 'Llave Maestra Global' : 'Acceso por Zona'}
                    </span>
                  </td>
                  <td>
                    <span className={t.esta_activa ? 'text-status-ok' : 'text-status-deny'}>
                      {t.esta_activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  {/* NUEVO: Botones de Editar y Eliminar */}
                  <td style={{ minWidth: '130px' }}>
                    <button 
                      onClick={() => onOpenRegisterModal(t)} 
                      style={{ marginRight: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f8f9fa', fontSize: '12px', color: 'black' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleEliminar(t.codigo_rfid)}
                      style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: '#fef2f2', fontSize: '12px' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
            {tarjetas.length === 0 && (
              <tr>
                <td colSpan="6">Sin tarjetas visibles para esta conexión.</td> {/* <-- Cambió de 5 a 6 */}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NUEVA PEQUEÑA VENTANA DE CONFIRMACIÓN */}
      {tarjetaAEliminar && (
        <div className="modal-backdrop" onClick={cancelarEliminacion}>
          <div 
            className="modal-container" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '400px', marginTop: '15vh' }}
          >
            <div className="modal-header">
              <div>
                <span className="section-badge-tag" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>Advertencia</span>
                <h2>Eliminar Tarjeta</h2>
              </div>
              <button className="modal-close-btn" onClick={cancelarEliminacion}>&times;</button>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '15px', color: '#334155' }}>
                ¿Estás seguro de que deseas eliminar la tarjeta con UID <strong>{tarjetaAEliminar}</strong>?
              </p>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Esta acción es permanente y no se puede deshacer.
              </p>
              
              <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" onClick={cancelarEliminacion}>
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} 
                  onClick={confirmarEliminacion}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
