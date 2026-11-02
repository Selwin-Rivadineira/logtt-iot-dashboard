import React from 'react';

export default function DoorsTab({ areas = [], getUltimoEventoPuerta }) {
  return (
    <div className="tab-puertas-view">
      <div className="section-top-header">
        <div>
          <span className="section-badge-tag">Supervisión de Puntos de Control</span>
          <h2>Detalle de Puertas Perimetrales</h2>
          <p className="section-desc">Monitoreo del último estado registrado por punto de control.</p>
        </div>
      </div>

      <div className="doors-detailed-grid wireframe-target" data-figma-label="Auto-Layout: Doors_Control_Matrix">
        {areas.length === 0 && <p>Sin áreas visibles para esta conexión.</p>}
        {areas.map((area) => {
          const areaId = area.id;
          const cfg = area;
          const ultimoEv = getUltimoEventoPuerta(areaId);
          const fueConcedido = ultimoEv ? ultimoEv.acceso_concedido : null;

          let estadoClase = 'sin-registros';
          let estadoTexto = 'Sin actividad';
          if (ultimoEv) {
            estadoClase = fueConcedido ? 'permitido' : 'denegado';
            estadoTexto = fueConcedido ? 'Permitido' : 'Denegado';
          }

          return (
            <div key={areaId} className="door-full-card">
              <div>
                <div className="door-full-top">
                  <span className="door-area-text">ÁREA 0{areaId}</span>
                  <span className={`status-text-clean ${estadoClase}`}>
                    {estadoTexto}
                  </span>
                </div>
                <h3 className="door-full-title">{cfg.descripcion || cfg.nombre}</h3>
                <div className="door-loc" style={{ marginBottom: 14 }}>{cfg.ubicacion}</div>

                {/* Indicadores Visuales Limpios */}
                <div className="virtual-actuators-box">
                  <div className="actuator-label">Indicador de Estado:</div>
                  <div className="leds-container">
                    <div className="led-item">
                      <div className={`led-lamp green ${fueConcedido === true ? 'glow' : ''}`}></div>
                      <span className="led-text">Permitido</span>
                    </div>
                    <div className="led-item">
                      <div className={`led-lamp red ${fueConcedido === false ? 'glow' : ''}`}></div>
                      <span className="led-text">Denegado</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#fdfdfd', borderLeft: '3px solid #ff4b2b', padding: '10px 14px', fontSize: 11, marginBottom: 14 }}>
                  <span style={{ color: '#888', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>
                    Último Registro:
                  </span>
                  <strong>UID: {ultimoEv ? ultimoEv.codigo_rfid_leido : 'Ninguno'}</strong>
                  <div style={{ color: '#666', marginTop: 4 }}>
                    {ultimoEv ? `${new Date(ultimoEv.fecha_hora).toLocaleString()} — ${ultimoEv.motivo}` : 'Sin lecturas reportadas'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#888', borderTop: '1px solid #eee', paddingTop: 10 }}>
                Identificador: <strong>{cfg.nombre}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
