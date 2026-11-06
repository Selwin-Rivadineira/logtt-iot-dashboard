import React from 'react';

export default function Header({
  areasCount = 0,
  isWireframe = false,
  onToggleWireframe,
}) {
  return (
    <header className="panel-topbar wireframe-target" data-figma-label="Frame: Topbar_Header">
      <div className="topbar-left">
        <div className="logo-badge">LOGTT</div>
        <div className="title-group">
          <h1>Sistema de Monitoreo de Acceso y Auditoría</h1>
        </div>
      </div>

      <div className="topbar-right">
        {/* Botón Modo Wireframe */}
        <button
          className={`btn-wireframe ${isWireframe ? 'active' : ''}`}
          onClick={onToggleWireframe}
        >
          {isWireframe ? 'Modo Render' : 'Modo Wireframe'}
        </button>

        <div className="chip-online">
          <span className="dot-pulse"></span>
          <span>{areasCount} áreas registradas</span>
        </div>

      </div>
    </header>
  );
}
