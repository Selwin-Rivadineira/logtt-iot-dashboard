import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard General' },
  { id: 'puertas', label: 'Estado de Puertas' },
  { id: 'historial', label: 'Historial de Accesos' },
  { id: 'usuarios', label: 'Usuarios y Permisos' },
];

export default function Sidebar({ activeTab, onSelectTab }) {
  return (
    <aside className="panel-sidebar wireframe-target" data-figma-label="Frame: Sidebar_Navigation">
      <div>
        <div className="sidebar-title">Navegación</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onSelectTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
