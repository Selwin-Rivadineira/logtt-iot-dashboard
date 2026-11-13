import React, { useState, useEffect } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import pusher from './services/pusher';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import DashboardTab from './components/dashboard/DashboardTab';
import DoorsTab from './components/doors/DoorsTab';
import HistoryTab from './components/history/HistoryTab';
import UsersTab from './components/users/UsersTab';
import CardRegisterModal from './components/cards/CardRegisterModal';
import './styles/App.css';

export default function App() {
  // Estado de navegación
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'puertas' | 'historial' | 'usuarios'
  const [isWireframe, setIsWireframe] = useState(false);

  // Estado del modal de gestión de tarjetas
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardModalTarjeta, setCardModalTarjeta] = useState(null);

  // Consumo centralizado de datos y sincronización periódica/realtime
  const { data, loading, errors, queryLatency, checked, refresh } = useDashboardData(true);
  const { area: areas, historial_acceso: historial, usuario: usuarios, tarjeta: tarjetas, permiso: permisos } = data;
  const hasErrors = Object.keys(errors).length > 0;

  // Abrir modal de tarjeta para nueva tarjeta o editar existente
  const handleOpenCardModal = (cardToEdit = null) => {
    setCardModalTarjeta(cardToEdit || null);
    setIsCardModalOpen(true);
  };

  // Resolución dinámica de área
  const getAreaObj = (areaId) => {
    const found = areas.find((a) => a.id === areaId);
    if (found) return found;
    return { id: areaId, nombre: `area_${areaId}`, descripcion: `Puerta Área ${areaId}`, ubicacion: '' };
  };

  // Suscripción a eventos Pusher para IoT en tiempo real (Node-RED: rfid-channel -> rfid-read)
  useEffect(() => {
    const unsubscribePusher = pusher.subscribeToRFID((payload) => {
      try {
        console.log('[LOGTT/Pusher] Evento RFID recibido desde Node-RED:', payload);
        refresh();
      } catch (err) {
        console.warn('[Pusher/Node-RED] Error procesando lectura RFID:', err);
        refresh();
      }
    });

    return () => {
      unsubscribePusher();
    };
  }, [refresh]);

  // Modo Wireframe
  const toggleWireframe = () => {
    const next = !isWireframe;
    setIsWireframe(next);
    if (next) {
      document.body.classList.add('wireframe-mode');
    } else {
      document.body.classList.remove('wireframe-mode');
    }
  };

  // Métricas calculadas para el dashboard
  const totalAccesos = historial.length;
  const permitidosCount = historial.filter((i) => i.acceso_concedido === true).length;
  const denegadosCount = historial.filter((i) => i.acceso_concedido === false).length;

  // Obtener último evento de una puerta en la BD
  const getUltimoEventoPuerta = (areaId) => {
    return historial.find((h) => h.area_id === areaId);
  };

  return (
    <div className="app-root">
        <div className="panel-wrapper">
          <Header
            areasCount={areas.length}
            isWireframe={isWireframe}
            onToggleWireframe={toggleWireframe}
          />

          <div className="panel-body-layout">
            <Sidebar
              activeTab={activeTab}
              onSelectTab={(tab) => setActiveTab(tab)}
            />

            <main className="panel-main-content">
              {activeTab === 'dashboard' && (
                <DashboardTab
                  totalAccesos={totalAccesos}
                  permitidosCount={permitidosCount}
                  denegadosCount={denegadosCount}
                  areas={areas}
                  queryLatency={queryLatency}
                  hasErrors={hasErrors}
                  getUltimoEventoPuerta={getUltimoEventoPuerta}
                  historial={historial}
                  getAreaObj={getAreaObj}
                  onNavigatePuertas={() => setActiveTab('puertas')}
                  onNavigateHistorial={() => setActiveTab('historial')}
                  loading={loading}
                  checked={checked}
                  errors={errors}
                />
              )}

              {activeTab === 'puertas' && (
                <DoorsTab
                  areas={areas}
                  getUltimoEventoPuerta={getUltimoEventoPuerta}
                />
              )}

              {activeTab === 'historial' && (
  <HistoryTab
    historial={historial}
    areas={areas}
    usuarios={usuarios}       // <-- Agregado para alimentar el historial
    tarjetas={tarjetas}       // <-- Agregado para hacer el cruce de tarjetas
    getAreaObj={getAreaObj}
    loading={loading}
    checked={checked}
    errors={errors}
    onRefresh={() => refresh()}
  />
)}

              {activeTab === 'usuarios' && (
                <UsersTab
                  usuarios={usuarios}
                  tarjetas={tarjetas}
                  permisos={permisos}
                  areas={areas}
                  getAreaObj={getAreaObj}
                  onOpenRegisterModal={(card) => handleOpenCardModal(card)}
                  onRefresh={() => refresh()}
                />
              )}
            </main>
          </div>

          {/* Modal de Gestión de Tarjetas */}
          <CardRegisterModal
            isOpen={isCardModalOpen}
            onClose={() => {
              setIsCardModalOpen(false);
              setCardModalTarjeta(null);
            }}
            onSuccess={() => {
              refresh();
            }}
            usuarios={usuarios}
            areas={areas}
            permisos={permisos}
            tarjetaAEditar={cardModalTarjeta}
          />
        </div>
    </div>
  );
}
