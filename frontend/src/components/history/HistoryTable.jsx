import React from 'react';

export default function HistoryTable({
  historialFiltrado = [],
  totalHistorial = 0,
  getAreaObj,
  loading = false,
  checked = false,
  errors = {},
  onOpenCardModal, // <-- Prop para disparar el modal con los datos de la fila
}) {
  return (
    <div className="logs-container-box wireframe-target" data-figma-label="Table: Historial_Acceso">
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha y Hora</th>
              <th>Área / Puerta</th>
              <th>Código RFID Leído</th>
              <th>Tarjeta Código</th>
              <th>Resultado</th>
              <th>Motivo / Auditoría</th>
              <th>Offline</th>
            </tr>
          </thead>
          <tbody>
            {historialFiltrado.map((row) => {
              // Verificamos si la tarjeta está sin asignar o no registrada
              const esNoRegistrada = !row.tarjeta_codigo || row.tarjeta_codigo === 'Sin Asignar';

              return (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>
                    <strong>{new Date(row.fecha_hora).toLocaleString()}</strong>
                  </td>
                  <td>
                    {getAreaObj(row.area_id)?.descripcion ||
                      getAreaObj(row.area_id)?.nombre ||
                      `Área ${row.area_id}`}
                  </td>
                  <td>
                    <code>{row.codigo_rfid_leido}</code>
                  </td>
                  <td>
                    {row.tarjeta_codigo && row.tarjeta_codigo !== 'Sin Asignar' ? (
                      <code>{row.tarjeta_codigo}</code>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#888' }}>Sin Asignar</span>
                        {onOpenCardModal && row.codigo_rfid_leido && (
                          <button
                            type="button"
                            style={{
                              backgroundColor: '#ff4b4b',
                              color: 'white',
                              border: 'none',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                            title="Registrar esta tarjeta UID"
                            onClick={() => onOpenCardModal(row.codigo_rfid_leido, row.area_id)}
                          >
                            + Registrar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={row.acceso_concedido ? 'text-status-ok' : 'text-status-deny'}>
                      {row.acceso_concedido ? 'Permitido' : 'Denegado'}
                    </span>
                  </td>
                  <td>
                    <small>{row.motivo || 'Validación'}</small>
                  </td>
                  <td>
                    <small>{row.sincronizado_offline ? 'Sí' : 'No'}</small>
                  </td>
                </tr>
              );
            })}
            {historialFiltrado.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                  {loading && !checked
                    ? 'Cargando historial…'
                    : errors.historial_acceso
                    ? 'No se pudo leer el historial. Revisa el error de conexión.'
                    : 'No hay registros visibles con los filtros actuales.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, textAlign: 'right', fontSize: 11, color: '#888' }}>
        Mostrando {historialFiltrado.length} de {totalHistorial} registros
      </div>
    </div>
  );
}