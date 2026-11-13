import React from 'react';

export default function PermissionsTable({ permisos = [], usuarios = [], tarjetas = [], getAreaObj }) {
  const masters = tarjetas.filter((card) => card.es_llave_maestra === true);
  const userLabel = (id) => {
    const user = usuarios.find((item) => item.id === id);
    return user ? user.nombre_completo : `Usuario #${id}`;
  };

  // Filtrar permisos de usuarios o tarjetas existentes
  const permisosConTarjeta = permisos.filter((p) => {
    if (p.codigo_rfid) {
      return tarjetas.some((card) => card.codigo_rfid === p.codigo_rfid);
    }
    return tarjetas.some((card) => card.usuario_id === p.usuario_id);
  });

  // Agrupar permisos por tarjeta (o usuario si es legacy) para mostrar todas sus áreas
  const permisosAgrupadosMap = permisosConTarjeta.reduce((acc, p) => {
    const key = p.codigo_rfid ? `card-${p.codigo_rfid}` : `user-${p.usuario_id}`;
    if (!acc[key]) {
      acc[key] = {
        usuario_id: p.usuario_id,
        codigo_rfid: p.codigo_rfid || null,
        areas: [],
        esta_activo: p.esta_activo !== false,
      };
    }
    const area = getAreaObj ? getAreaObj(p.area_id) : null;
    const nombreArea = area?.descripcion || area?.nombre || `Área ${p.area_id}`;
    if (!acc[key].areas.includes(nombreArea)) {
      acc[key].areas.push(nombreArea);
    }
    return acc;
  }, {});

  const permisosAgrupados = Object.values(permisosAgrupadosMap);

  return (
    <div className="logs-container-box wireframe-target" data-figma-label="Table: Permisos_Areas">
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Permisos de Acceso</h3>
      <p className="section-desc">Los permisos individuales provienen de la tabla permiso y se vinculan con las tarjetas por zona física. La llave maestra se identifica por la tarjeta; el controlador determina su acceso.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead><tr><th>Usuario</th><th>Tarjeta RFID</th><th>Área autorizada</th><th>Estado</th></tr></thead>
          <tbody>
            {permisosAgrupados.map((item, index) => {
              const tarjetaLabel = item.codigo_rfid
                ? item.codigo_rfid
                : (tarjetas.filter((card) => card.usuario_id === item.usuario_id).map((c) => c.codigo_rfid).join(', ') || 'Sin tarjeta asignada');
              return (
                <tr key={`permiso-${item.codigo_rfid || item.usuario_id}-${index}`}>
                  <td>{userLabel(item.usuario_id)}</td>
                  <td><code>{tarjetaLabel}</code></td>
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
