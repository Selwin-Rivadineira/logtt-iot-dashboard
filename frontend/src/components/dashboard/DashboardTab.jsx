import React from 'react';
import KpiCards from './KpiCards';
import QuickDoorsList from './QuickDoorsList';
import RecentLogsTable from './RecentLogsTable';

export default function DashboardTab({
  totalAccesos,
  permitidosCount,
  denegadosCount,
  areas,
  queryLatency,
  hasErrors,
  getUltimoEventoPuerta,
  historial,
  getAreaObj,
  onNavigatePuertas,
  onNavigateHistorial,
  loading,
  checked,
  errors,
}) {
  return (
    <div className="tab-dashboard-view">
      <div className="section-top-header">
        <div>
          <span className="section-badge-tag">Monitoreo en Tiempo Real</span>
          <h2>Métricas y Registro de Operación</h2>
          <p className="section-desc">
            Supervisión centralizada de puntos de acceso y auditoría de eventos.
          </p>
        </div>
      </div>

      <KpiCards
        totalAccesos={totalAccesos}
        permitidosCount={permitidosCount}
        denegadosCount={denegadosCount}
        areasCount={areas.length}
        queryLatency={queryLatency}
        hasErrors={hasErrors}
      />

      <QuickDoorsList
        areas={areas}
        getUltimoEventoPuerta={getUltimoEventoPuerta}
        onNavigatePuertas={onNavigatePuertas}
      />

      <RecentLogsTable
        historial={historial}
        getAreaObj={getAreaObj}
        onNavigateHistorial={onNavigateHistorial}
        loading={loading}
        checked={checked}
        errors={errors}
      />
    </div>
  );
}
