import React from 'react';

export default function QuickDoorsList({ areas = [], getUltimoEventoPuerta, onNavigatePuertas }) {
  return (
    <>
      <div className="section-subtitle">
        <span>Estado Reciente de Puertas</span>
        <button
          className="ghost"
          style={{ color: '#ff4b2b', padding: 0 }}
          onClick={onNavigatePuertas}
        >
          Ver detalle de puertas →
        </button>
      </div>

      <div className="doors-grid-quick wireframe-target" data-figma-label="Auto-Layout: Quick_Doors_List">
        {areas.length === 0 && <p>Sin áreas visibles para esta conexión.</p>}
        {areas.map((area) => {
          const areaId = area.id;
          const cfg = area;
          const ultimoEv = getUltimoEventoPuerta(areaId);
          const fueConcedido = ultimoEv ? ultimoEv.acceso_concedido : null;

          let estadoClase = 'sin-registros';
          let estadoTexto = 'Sin registros';
          if (ultimoEv) {
            estadoClase = fueConcedido ? 'permitido' : 'denegado';
            estadoTexto = fueConcedido ? 'Acceso Permitido' : 'Acceso Denegado';
          }

          return (
            <div key={areaId} className="door-card-quick">
              <div className="door-quick-top">
                <span className="door-area-text">Área 0{areaId}</span>
                <div className="door-mini-leds">
                  <span className={`mini-led-indicator ${fueConcedido === true ? 'green-on' : ''}`}></span>
                  <span className={`mini-led-indicator ${fueConcedido === false ? 'red-on' : ''}`}></span>
                </div>
              </div>
              <h4 className="door-name">{cfg.descripcion || cfg.nombre}</h4>
              <div className="door-loc">{cfg.ubicacion}</div>

              <span className={`status-text-clean ${estadoClase}`}>
                {estadoTexto}
              </span>

              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                {ultimoEv ? `Último UID: ${ultimoEv.codigo_rfid_leido}` : 'Esperando lectura'}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
