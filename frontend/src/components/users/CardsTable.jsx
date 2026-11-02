import React from 'react';

export default function CardsTable({ tarjetas = [], usuarios = [], onOpenRegisterModal }) {
  return (
    <div className="logs-container-box mb-20 wireframe-target" data-figma-label="Table: Tarjetas_RFID">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Tarjetas RFID & Llaves Maestras</h3>
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
              <th>Usuario Asignado</th>
              <th>Tipo de Llave</th>
              <th>Estado</th>
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
                  <td>{u ? u.nombre_completo : `Usuario #${t.usuario_id}`}</td>
                  <td>
                    <span className={t.es_llave_maestra ? 'text-rol-admin' : 'text-rol-user'}>
                      {t.es_llave_maestra ? 'Llave Maestra' : 'Estándar'}
                    </span>
                  </td>
                  <td>
                    <span className={t.esta_activa ? 'text-status-ok' : 'text-status-deny'}>
                      {t.esta_activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {tarjetas.length === 0 && (
              <tr>
                <td colSpan="4">Sin tarjetas visibles para esta conexión.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
