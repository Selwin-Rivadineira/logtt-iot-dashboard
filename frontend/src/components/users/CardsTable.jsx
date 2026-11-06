import React from 'react';

export default function CardsTable({
  tarjetas = [],
  usuarios = [],
  areas = [],
  permisos = [],
  getAreaObj,
  onOpenRegisterModal,
}) {
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
                </tr>
              );
            })}
            {tarjetas.length === 0 && (
              <tr>
                <td colSpan="5">Sin tarjetas visibles para esta conexión.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
