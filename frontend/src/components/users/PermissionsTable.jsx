import React from 'react';

export default function PermissionsTable({ permisos = [], usuarios = [], getAreaObj }) {
  return (
    <div className="logs-container-box wireframe-target" data-figma-label="Table: Permisos_Areas">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Permisos de Acceso</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Área Autorizada</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {permisos.map((p, idx) => {
              const u = usuarios.find((usr) => usr.id === p.usuario_id);
              const area = getAreaObj(p.area_id);
              return (
                <tr key={idx}>
                  <td>{u ? u.nombre_completo : `Usuario #${p.usuario_id}`}</td>
                  <td>{area?.descripcion || area?.nombre || `Área ${p.area_id}`}</td>
                  <td>
                    <span className={p.esta_activo ? 'text-status-ok' : 'text-status-deny'}>
                      {p.esta_activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {permisos.length === 0 && (
              <tr>
                <td colSpan="3">Sin permisos visibles para esta conexión.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
