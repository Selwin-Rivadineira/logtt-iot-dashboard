import React, { useState } from 'react';
import UsersTable from './UsersTable';
import CardsTable from './CardsTable';
import PermissionsTable from './PermissionsTable';
import UserRegisterModal from './UserRegisterModal';

export default function UsersTab({
  usuarios = [],
  tarjetas = [],
  permisos = [],
  areas = [],
  getAreaObj,
  onOpenRegisterModal,
  onRefresh,
}) {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

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

      <UsersTable 
        usuarios={usuarios} 
        onOpenUserModal={() => setIsUserModalOpen(true)} 
      />
      
      <CardsTable
        tarjetas={tarjetas}
        usuarios={usuarios}
        areas={areas}
        permisos={permisos}
        getAreaObj={getAreaObj}
        onOpenRegisterModal={onOpenRegisterModal}
        onRefresh={onRefresh}
      />
      
      <PermissionsTable 
        permisos={permisos} 
        usuarios={usuarios} 
        tarjetas={tarjetas} 
        getAreaObj={getAreaObj} 
      />

      <UserRegisterModal 
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onRefresh={onRefresh}
      />
    </div>
  );
}