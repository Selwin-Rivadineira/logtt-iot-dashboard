import React from 'react';
import UsersTable from './UsersTable';
import CardsTable from './CardsTable';
import PermissionsTable from './PermissionsTable';

export default function UsersTab({
  usuarios = [],
  tarjetas = [],
  permisos = [],
  getAreaObj,
  onOpenRegisterModal,
}) {
  return (
    <div className="tab-usuarios-view">
      <div className="section-top-header">
        <div>
          <span className="section-badge-tag">Control de Identidades</span>
          <h2>Usuarios, Llaves Maestras y Permisos</h2>
          <p className="section-desc">
            Entidades registradas y permisos de acceso por punto de control.
          </p>
        </div>
      </div>

      <UsersTable usuarios={usuarios} />
      <CardsTable
        tarjetas={tarjetas}
        usuarios={usuarios}
        onOpenRegisterModal={onOpenRegisterModal}
      />
      <PermissionsTable permisos={permisos} usuarios={usuarios} tarjetas={tarjetas} getAreaObj={getAreaObj} />
    </div>
  );
}
