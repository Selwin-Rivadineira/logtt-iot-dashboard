import React from 'react';

export default function RecentLogsTable({
  historial = [],
  getAreaObj,
  onNavigateHistorial,
  loading = false,
  checked = false,
  errors = {},
}) {
  return (
    <div className="logs-container-box wireframe-target" data-figma-label="Component: Recent_Logs_Table">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, color: '#333' }}>Últimos Registros de Acceso</h3>
        </div>
        <button className="ghost" style={{ color: '#ff4b2b' }} onClick={onNavigateHistorial}>
          Ver historial completo →
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Área / Puerta</th>
              <th>Código RFID Leído</th>
              <th>Tarjeta Asignada</th>
              <th>Resultado</th>
              <th>Motivo</th>
              <th>Sincronizado Offline</th>
            </tr>
          </thead>
          <tbody>
            {historial.slice(0, 5).map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.fecha_hora).toLocaleTimeString()}</td>
                <td>{getAreaObj(row.area_id)?.descripcion || `Área ${row.area_id}`}</td>
                <td><code>{row.codigo_rfid_leido}</code></td>
                <td>{row.tarjeta_codigo ? <code>{row.tarjeta_codigo}</code> : 'Sin Asignar'}</td>
                <td>
                  <span className={row.acceso_concedido ? 'text-status-ok' : 'text-status-deny'}>
                    {row.acceso_concedido ? 'Permitido' : 'Denegado'}
                  </span>
                </td>
                <td><small>{row.motivo || 'Verificación'}</small></td>
                <td><small>{row.sincronizado_offline ? 'Sí' : 'No'}</small></td>
              </tr>
            ))}
            {historial.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px 12px', color: '#888' }}>
                  {loading && !checked
                    ? 'Cargando eventos…'
                    : errors.historial_acceso
                    ? 'No se pudo leer el historial. Revisa el error de conexión.'
                    : 'Sin eventos visibles para esta conexión.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
