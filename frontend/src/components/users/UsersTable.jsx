import React, { useState } from 'react';
import UserRegisterModal from './UserRegisterModal';
import UserDeleteModal from './UserDeleteModal';

export default function UsersTable({ usuarios = [], onOpenUserModal, onRefresh }) {
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [usuarioEliminando, setUsuarioEliminando] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleEditClick = (u) => {
    setUsuarioEditando(u);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (u) => {
    setUsuarioEliminando(u);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="logs-container-box mb-20 wireframe-target" data-figma-label="Table: Usuarios_Registrados">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Usuarios Registrados</h3>
        <button 
          className="btn-primary" 
          style={{ backgroundColor: '#ff4b4b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={onOpenUserModal}
        >
          + Nuevo Usuario
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="logs-data-table">
         <thead>
            <tr>
              <th>ID</th>
              <th>Nombre Completo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>#{u.id}</td>
                <td>
                  <strong>{u.nombre_completo}</strong>
                </td>
                <td>
                  <span className={u.rol === 'admin' ? 'text-rol-admin' : 'text-rol-user'}>
                    {u.rol}
                  </span>
                </td>
                <td>
                  <span className={u.esta_activo ? 'text-status-ok' : 'text-status-deny'}>
                    {u.esta_activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleEditClick(u)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteClick(u)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      color: '#ff4b4b',
                      border: '1px solid #ff4b4b',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>Sin usuarios visibles para esta conexión.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Edición */}
      <UserRegisterModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        usuarioAEditar={usuarioEditando}
        onRefresh={onRefresh}
      />

      {/* Modal de Eliminación */}
      <UserDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        usuario={usuarioEliminando}
        onRefresh={onRefresh}
      />
    </div>
  );
}