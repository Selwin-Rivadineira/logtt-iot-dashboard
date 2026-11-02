import React from 'react';

export default function KpiCards({
  totalAccesos = 0,
  permitidosCount = 0,
  denegadosCount = 0,
  areasCount = 0,
  queryLatency = null,
  hasErrors = false,
}) {
  return (
    <div className="kpi-grid wireframe-target" data-figma-label="Auto-Layout: KPI_Cards_Grid">
      <div className="kpi-card">
        <div className="kpi-number">{totalAccesos}</div>
        <div className="kpi-label">Total Eventos Registrados</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-number success">{permitidosCount}</div>
        <div className="kpi-label">Accesos Autorizados</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-number danger">{denegadosCount}</div>
        <div className="kpi-label">Intentos Denegados</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-number">{areasCount}</div>
        <div className="kpi-label">Áreas Monitoreadas</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-number">
          {queryLatency !== null && !hasErrors ? `${queryLatency}ms` : '—'}
        </div>
        <div className="kpi-label">Latencia del Servidor</div>
      </div>
    </div>
  );
}
