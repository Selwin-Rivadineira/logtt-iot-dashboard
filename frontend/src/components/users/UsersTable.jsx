import React from 'react';

export default function UsersTable({ usuarios = [] }) {
  return (
    <div className="logs-container-box mb-20 wireframe-target" data-figma-label="Table: Usuarios_Registrados">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Usuarios Registrados</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre Completo</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td>
                  <strong>{u.nombre_completo}</strong>
                </td>
                <td>
                  <span className={u.rol === 'admin' ? 'text-rol-admin' : 'text-rol-user'}>
                    {u.rol}
                  </span>
                </td>
                <td>
                  <span className={u.esta_activo ? 'text-status-ok' : 'text-status-deny'}>
                    {u.esta_activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="4">Sin usuarios visibles para esta conexión.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
