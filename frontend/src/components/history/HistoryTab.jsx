import React, { useState } from 'react';
import HistoryFilters from './HistoryFilters';
import HistoryTable from './HistoryTable';

export default function HistoryTab({
  historial = [],
  areas = [],
  getAreaObj,
  loading = false,
  checked = false,
  errors = {},
  onRegisterUnknownUid,
}) {
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroArea, setFiltroArea] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Exportar auditoría a CSV
  const exportarCSV = () => {
    if (historial.length === 0) return alert('No existen registros para exportar.');
    const columns = ['id', 'fecha_hora', 'area_id', 'codigo_rfid_leido', 'tarjeta_codigo', 'acceso_concedido', 'motivo', 'sincronizado_offline'];
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [columns.join(','), ...historial.map((row) => columns.map((key) => escapeCsv(row[key])).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_historial_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Filtrado de registros
  const historialFiltrado = historial.filter((item) => {
    const texto = filtroTexto.toLowerCase();
    const matchTexto =
      !texto ||
      (item.codigo_rfid_leido && item.codigo_rfid_leido.toLowerCase().includes(texto)) ||
      (item.tarjeta_codigo && item.tarjeta_codigo.toLowerCase().includes(texto)) ||
      (item.motivo && item.motivo.toLowerCase().includes(texto));

    const matchArea = filtroArea === 'todas' || item.area_id === parseInt(filtroArea);
    const matchEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'concedido' && item.acceso_concedido === true) ||
      (filtroEstado === 'denegado' && item.acceso_concedido === false);

    return matchTexto && matchArea && matchEstado;
  });

  return (
    <div className="tab-historial-view">
      <div className="section-top-header">
        <div>
          <span className="section-badge-tag">Auditoría de Accesos</span>
          <h2>Historial Completo de Registros</h2>
          <p className="section-desc">
            Cada fila corresponde a un registro guardado. Los permisos actuales pueden ser diferentes de los vigentes cuando ocurrió el evento.
          </p>
        </div>
        <div>
          <button className="btn-secondary" onClick={exportarCSV}>
            Exportar CSV
          </button>
        </div>
      </div>

      <HistoryFilters
        filtroTexto={filtroTexto}
        setFiltroTexto={setFiltroTexto}
        filtroArea={filtroArea}
        setFiltroArea={setFiltroArea}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        areas={areas}
      />

      <HistoryTable
        historialFiltrado={historialFiltrado}
        totalHistorial={historial.length}
        getAreaObj={getAreaObj}
        loading={loading}
        checked={checked}
        errors={errors}
        onRegisterUnknownUid={onRegisterUnknownUid}
      />
    </div>
  );
}
