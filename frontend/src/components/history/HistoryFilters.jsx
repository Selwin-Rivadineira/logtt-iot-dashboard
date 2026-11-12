import React from 'react';

export default function HistoryFilters({
  filtroTexto,
  setFiltroTexto,
  filtroArea,
  setFiltroArea,
  filtroEstado,
  setFiltroEstado,
  areas = [],
  onOpenCardModal, // <-- NUEVA PROP
}) {
  return (
    <div className="filter-toolbar logs-container-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
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

      {/* Botón "+ Nueva Tarjeta" alineado a la derecha en la misma barra */}
      {onOpenCardModal && (
        <div>
          <button
            className="btn-primary"
            style={{
              backgroundColor: '#ff4b4b',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '13px'
            }}
            onClick={onOpenCardModal}
          >
            + Nueva Tarjeta
          </button>
        </div>
      )}
    </div>
  );
}