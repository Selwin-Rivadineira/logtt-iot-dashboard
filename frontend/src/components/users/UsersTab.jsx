import React from 'react';
import UsersTable from './UsersTable';
import CardsTable from './CardsTable';
import PermissionsTable from './PermissionsTable';

export default function UsersTab({
  usuarios = [],
  tarjetas = [],
  permisos = [],
  areas = [],
  getAreaObj,
  onOpenRegisterModal,
}) {
  return (
    <div className="tab-usuarios-view">
      <div className="section-top-header">
        <div>
          <span className="section-badge-tag">Control de Identidades & Accesos</span>
          <h2>Usuarios, Tarjetas por Zona y Permisos</h2>
          <p className="section-desc">
            Credenciales de acceso vinculadas por zona física (control perimetral no restringido por rol).
          </p>
        </div>
      </div>

      <UsersTable usuarios={usuarios} />
      <CardsTable
        tarjetas={tarjetas}
        usuarios={usuarios}
        areas={areas}
        permisos={permisos}
        getAreaObj={getAreaObj}
        onOpenRegisterModal={onOpenRegisterModal}
      />
      <PermissionsTable permisos={permisos} usuarios={usuarios} tarjetas={tarjetas} getAreaObj={getAreaObj} />
    </div>
  );
}
