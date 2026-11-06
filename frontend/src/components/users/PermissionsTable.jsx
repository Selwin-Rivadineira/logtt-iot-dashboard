import React from 'react';

export default function PermissionsTable({ permisos = [], usuarios = [], tarjetas = [], getAreaObj }) {
  const masters = tarjetas.filter((card) => card.es_llave_maestra === true);
  const userLabel = (id) => {
    const user = usuarios.find((item) => item.id === id);
    return user ? `${user.nombre_completo} (#${user.id})` : `Usuario #${id}`;
  };

  return (
    <div className="logs-container-box wireframe-target" data-figma-label="Table: Permisos_Areas">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Permisos de Acceso</h3>
      <p className="section-desc">Los permisos individuales provienen de la tabla permiso y se vinculan con las tarjetas por usuario. La llave maestra se identifica por la tarjeta; el controlador determina su acceso.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead><tr><th>Usuario</th><th>Tarjeta RFID</th><th>Área autorizada</th><th>Estado</th></tr></thead>
          <tbody>
            {permisos.map((permission, index) => {
              const cards = tarjetas.filter((card) => card.usuario_id === permission.usuario_id);
              const area = getAreaObj(permission.area_id);
              return (
                <tr key={`${permission.usuario_id}-${permission.area_id}-${index}`}>
                  <td>{userLabel(permission.usuario_id)}</td>
                  <td>{cards.length ? cards.map((card) => card.codigo_rfid).join(', ') : 'Sin tarjeta asignada'}</td>
                  <td>{area?.descripcion || area?.nombre || `Área ${permission.area_id}`}</td>
                  <td><span className={permission.esta_activo ? 'text-status-ok' : 'text-status-deny'}>{permission.esta_activo ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              );
            })}
            {masters.map((card) => (
              <tr key={`master-${card.codigo_rfid}`}>
                <td>{userLabel(card.usuario_id)}</td>
                <td>{card.codigo_rfid}</td>
                <td>Todas las puertas (llave maestra)</td>
                <td><span className={card.esta_activa ? 'text-status-ok' : 'text-status-deny'}>{card.esta_activa ? 'Tarjeta activa' : 'Tarjeta inactiva'}</span></td>
              </tr>
            ))}
            {permisos.length === 0 && masters.length === 0 && (
              <tr><td colSpan="4">Sin permisos ni llaves maestras visibles para esta conexión.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
