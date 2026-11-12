import React from 'react';

export default function PermissionsTable({ permisos = [], usuarios = [], tarjetas = [], getAreaObj }) {
  const masters = tarjetas.filter((card) => card.es_llave_maestra === true);
  const userLabel = (id) => {
    const user = usuarios.find((item) => item.id === id);
    return user ? user.nombre_completo : `Usuario #${id}`;
  };

    // Filtrar permisos solo de usuarios que tienen tarjetas asignadas
  const permisosConTarjeta = permisos.filter((p) => {
    const tieneTarjeta = tarjetas.some((card) => card.usuario_id === p.usuario_id);
    return tieneTarjeta;
  });

  // Agrupar permisos por usuario_id para mostrar todas sus áreas en una sola fila
  const permisosAgrupadosMap = permisosConTarjeta.reduce((acc, p) => {
    if (!acc[p.usuario_id]) {
      acc[p.usuario_id] = {
        usuario_id: p.usuario_id,
        areas: [],
        esta_activo: p.esta_activo
      };
    }
    const area = getAreaObj(p.area_id);
    const nombreArea = area?.descripcion || area?.nombre || `Área ${p.area_id}`;
    if (!acc[p.usuario_id].areas.includes(nombreArea)) {
      acc[p.usuario_id].areas.push(nombreArea);
    }
    return acc;
  }, {});

  const permisosAgrupados = Object.values(permisosAgrupadosMap);

  return (
    <div className="logs-container-box wireframe-target" data-figma-label="Table: Permisos_Areas">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Permisos de Acceso</h3>
      <p className="section-desc">Los permisos individuales provienen de la tabla permiso y se vinculan con las tarjetas por usuario. La llave maestra se identifica por la tarjeta; el controlador determina su acceso.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead><tr><th>Usuario</th><th>Tarjeta RFID</th><th>Área autorizada</th><th>Estado</th></tr></thead>
          <tbody>
            {permisosAgrupados.map((item, index) => {
              const cards = tarjetas.filter((card) => card.usuario_id === item.usuario_id);
              return (
                <tr key={`permiso-usuario-${item.usuario_id}-${index}`}>
                  <td>{userLabel(item.usuario_id)}</td>
                  <td>{cards.length ? cards.map((card) => card.codigo_rfid).join(', ') : 'Sin tarjeta asignada'}</td>
                  <td>{item.areas.join(', ')}</td>
                  <td><span className={item.esta_activo ? 'text-status-ok' : 'text-status-deny'}>{item.esta_activo ? 'Activo' : 'Inactivo'}</span></td>
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
