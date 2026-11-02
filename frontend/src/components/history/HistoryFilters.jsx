import React from 'react';

export default function HistoryFilters({
  filtroTexto,
  setFiltroTexto,
  filtroArea,
  setFiltroArea,
  filtroEstado,
  setFiltroEstado,
  areas = [],
}) {
  return (
    <div className="filter-toolbar logs-container-box">
      <div className="filter-item">
        <label>Buscar:</label>
        <input
          type="text"
          placeholder="UID, código o motivo..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
      </div>
      <div className="filter-item">
        <label>Área:</label>
        <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)}>
          <option value="todas">Todas las Puertas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.descripcion || a.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-item">
        <label>Resultado:</label>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="concedido">Concedidos</option>
          <option value="denegado">Denegados</option>
        </select>
      </div>
    </div>
  );
}
