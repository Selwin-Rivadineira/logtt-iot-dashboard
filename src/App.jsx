import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from './supabaseClient';
import './App.css';

// Mapeo inicial por defecto de áreas/puertas (fallback si la BD está vacía)
const AREAS_DEFAULT = [
  { id: 1, nombre: 'norte', descripcion: 'Puerta Norte', ubicacion: 'Acceso Principal' },
  { id: 2, nombre: 'sur',   descripcion: 'Puerta Sur',   ubicacion: 'Datacenter' },
  { id: 3, nombre: 'este',  descripcion: 'Puerta Este',  ubicacion: 'Laboratorio' },
  { id: 4, nombre: 'oeste', descripcion: 'Puerta Oeste', ubicacion: 'Almacén' }
];

// Datos iniciales de la base de datos
const DATOS_INICIALES_BD = {
  historial_acceso: [
    {
      id: 2,
      codigo_rfid_leido: '11223344',
      tarjeta_codigo: '11223344',
      area_id: 1,
      fecha_hora: '2026-10-14T13:28:49.638Z',
      acceso_concedido: true,
      motivo: 'Permiso valido',
      sincronizado_offline: false
    },
    {
      id: 1,
      codigo_rfid_leido: '01020304',
      tarjeta_codigo: null,
      area_id: 1,
      fecha_hora: '2026-10-14T13:28:40.489Z',
      acceso_concedido: false,
      motivo: 'Tarjeta no registrada',
      sincronizado_offline: false
    }
  ],
  usuario: [
    { id: 1, nombre_completo: 'Administrador', rol: 'admin', esta_activo: true },
    { id: 2, nombre_completo: 'Usuario Prueba', rol: 'empleado', esta_activo: true }
  ],
  tarjeta: [
    { codigo_rfid: 'AABBCCDD', usuario_id: 1, es_llave_maestra: true, esta_activa: true },
    { codigo_rfid: '11223344', usuario_id: 2, es_llave_maestra: false, esta_activa: true }
  ],
  permiso: [
    { usuario_id: 2, area_id: 1, esta_activo: true },
    { usuario_id: 2, area_id: 3, esta_activo: true }
  ]
};

export default function App() {
  // Navegación
  const [view, setView] = useState('login'); // 'login' | 'panel'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'puertas' | 'historial' | 'usuarios'
  const [isSignUpActive, setIsSignUpActive] = useState(false);
  const [isWireframe, setIsWireframe] = useState(false);

  // Datos reales leídos directamente de la Base de Datos Supabase
  const [areas, setAreas] = useState(AREAS_DEFAULT);
  const [historial, setHistorial] = useState(DATOS_INICIALES_BD.historial_acceso);
  const [usuarios, setUsuarios] = useState(DATOS_INICIALES_BD.usuario);
  const [tarjetas, setTarjetas] = useState(DATOS_INICIALES_BD.tarjeta);
  const [permisos, setPermisos] = useState(DATOS_INICIALES_BD.permiso);

  // Estados de consulta
  const [loading, setLoading] = useState(false);
  const [queryLatency, setQueryLatency] = useState(null);

  // Filtros de auditoría
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroArea, setFiltroArea] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Función de resolución de área dinámica
  const getAreaObj = (areaId) => {
    const found = areas.find((a) => a.id === areaId);
    if (found) return found;
    return { id: areaId, nombre: `area_${areaId}`, descripcion: `Puerta Área ${areaId}`, ubicacion: 'Zona Controlada' };
  };

  // Consulta directa a la base de datos Supabase (historial_acceso)
  const fetchHistorial = async (silent = false) => {
    if (!silent) setLoading(true);
    const t0 = performance.now();

    const client = getSupabaseClient();
    if (!client) {
      if (!silent) setLoading(false);
      return;
    }

    try {
      const { data, error } = await client
        .from('historial_acceso')
        .select('*')
        .order('fecha_hora', { ascending: false })
        .limit(100);

      const t1 = performance.now();
      setQueryLatency(Math.round(t1 - t0));

      if (!error && data && data.length > 0) {
        setHistorial(data);
      }
    } catch (err) {
      console.warn('Consulta de base de datos:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Lectura directa de todas las tablas auxiliares de la BD (area, usuario, tarjeta, permiso)
  const fetchTablasAuxiliares = async () => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const [resAreas, resUsuarios, resTarjetas, resPermisos] = await Promise.all([
        client.from('area').select('*'),
        client.from('usuario').select('*'),
        client.from('tarjeta').select('*'),
        client.from('permiso').select('*')
      ]);

      if (resAreas.data && resAreas.data.length > 0) {
        const areasMapeadas = resAreas.data.map((a) => ({
          ...a,
          ubicacion: a.ubicacion || (a.id === 1 ? 'Acceso Principal' : a.id === 2 ? 'Datacenter' : a.id === 3 ? 'Laboratorio' : 'Almacén')
        }));
        setAreas(areasMapeadas);
      }
      if (resUsuarios.data && resUsuarios.data.length > 0) setUsuarios(resUsuarios.data);
      if (resTarjetas.data && resTarjetas.data.length > 0) setTarjetas(resTarjetas.data);
      if (resPermisos.data && resPermisos.data.length > 0) setPermisos(resPermisos.data);
    } catch (e) {
      console.warn('Lectura de entidades secundarias:', e);
    }
  };

  // Suscripción Real-Time WebSocket + Polling silencioso continuo sin recargar página
  useEffect(() => {
    if (view === 'panel') {
      fetchHistorial(false);
      fetchTablasAuxiliares();

      // 1. Canal WebSocket de Supabase para detección instantánea de INSERT
      const client = getSupabaseClient();
      let canal = null;
      if (client) {
        canal = client
          .channel('cambios_historial_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_acceso' }, () => {
            fetchHistorial(true);
          })
          .subscribe();
      }

      // 2. Sondeo en segundo plano cada 2 segundos (garantiza actualización automática sin refresh)
      const pollInterval = setInterval(() => {
        fetchHistorial(true);
      }, 2000);

      return () => {
        if (client && canal) client.removeChannel(canal);
        clearInterval(pollInterval);
      };
    }
  }, [view]);

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

  // Exportar auditoría a CSV
  const exportarCSV = () => {
    if (historial.length === 0) return alert('No existen registros para exportar.');
    let csv = 'ID,Fecha_Hora,Area_ID,Codigo_RFID_Leido,Tarjeta_Codigo,Acceso_Concedido,Motivo,Sincronizado_Offline\r\n';
    historial.forEach((r) => {
      csv += `"${r.id}","${r.fecha_hora}","${r.area_id}","${r.codigo_rfid_leido}","${r.tarjeta_codigo || ''}","${r.acceso_concedido}","${r.motivo || ''}"\r\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auditoria_historial_${Date.now()}.csv`;
    link.click();
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

  // Métricas calculadas directamente desde la base de datos
  const totalAccesos = historial.length;
  const permitidosCount = historial.filter((i) => i.acceso_concedido === true).length;
  const denegadosCount = historial.filter((i) => i.acceso_concedido === false).length;

  // Obtener último evento de una puerta en la BD
  const getUltimoEventoPuerta = (areaId) => {
    return historial.find((h) => h.area_id === areaId);
  };

  return (
    <div className="app-root">

      {/* ==================================================== */}
      {/* VISTA 1: INICIO DE SESIÓN                            */}
      {/* ==================================================== */}
      {view === 'login' && (
        <div className="login-view-wrapper">
          <div className={`login-card-container ${isSignUpActive ? 'right-panel-active' : ''} wireframe-target`} data-figma-label="Frame: Auth_Double_Slider">

            {/* Formulario Registro */}
            <div className="login-form-container sign-up-container">
              <form onSubmit={(e) => { e.preventDefault(); setView('panel'); }}>
                <h1>Crear Cuenta</h1>
                <span>Registro de operador institucional</span>
                <input type="text" placeholder="Nombre Completo" defaultValue="Usuario Prueba" />
                <input type="email" placeholder="Email institucional" defaultValue="prueba@logtt.iot" />
                <input type="password" placeholder="Contraseña de acceso" defaultValue="••••••••" />
                <button type="submit">Registrar</button>
                <button type="button" className="mobile-switch-auth-btn" onClick={() => setIsSignUpActive(false)}>
                  ¿Ya tienes cuenta? Inicia Sesión
                </button>
              </form>
            </div>

            {/* Formulario Iniciar Sesión */}
            <div className="login-form-container sign-in-container">
              <form onSubmit={(e) => { e.preventDefault(); setView('panel'); }}>
                <h1>Iniciar Sesión</h1>
                <span>Control y monitoreo de acceso</span>
                <input type="email" placeholder="Email" defaultValue="selwin.rivadineira@logtt.iot" />
                <input type="password" placeholder="Contraseña" defaultValue="admin123" />
                <a href="#" className="forgot-link">¿Olvidaste tu contraseña?</a>
                <button type="submit">Iniciar Sesión</button>
                <button type="button" className="mobile-switch-auth-btn" onClick={() => setIsSignUpActive(true)}>
                  ¿No tienes cuenta? Crear Cuenta
                </button>
              </form>
            </div>

            {/* Overlay deslizante */}
            <div className="overlay-container">
              <div className="overlay">
                <div className="overlay-panel overlay-left">
                  <h1>Bienvenido</h1>
                  <p>Inicia sesión con tu cuenta para acceder al panel de control y auditoría.</p>
                  <button className="ghost" onClick={() => setIsSignUpActive(false)}>Iniciar Sesión</button>
                </div>
                <div className="overlay-panel overlay-right">
                  <h1>LOGTT IoT</h1>
                  <p>Plataforma de monitoreo perimetral y auditoría de accesos en tiempo real.</p>
                  <button className="ghost" onClick={() => setIsSignUpActive(true)}>Crear Cuenta</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* VISTA 2: PANEL DE CONTROL Y AUDITORÍA                */}
      {/* ==================================================== */}
      {view === 'panel' && (
        <div className="panel-wrapper">

          {/* Topbar */}
          <header className="panel-topbar wireframe-target" data-figma-label="Frame: Topbar_Header">
            <div className="topbar-left">
              <div className="logo-badge">LOGTT</div>
              <div className="title-group">
                <h1>Sistema de Monitoreo de Acceso y Auditoría</h1>
              </div>
            </div>

            <div className="topbar-right">
              {/* Botón Modo Wireframe */}
              <button className={`btn-wireframe ${isWireframe ? 'active' : ''}`} onClick={toggleWireframe}>
                {isWireframe ? 'Modo Render' : 'Modo Wireframe'}
              </button>

              <div className="chip-online">
                <span className="dot-pulse"></span>
                <span>4 Lectores en Servicio</span>
              </div>

              <span className="user-chip">Selwin Rivadineira</span>
              <button className="btn-logout" onClick={() => setView('login')}>Cerrar Sesión</button>
            </div>
          </header>

          {/* Layout Principal: Sidebar + Main Content */}
          <div className="panel-body-layout">

            {/* Sidebar */}
            <aside className="panel-sidebar wireframe-target" data-figma-label="Frame: Sidebar_Navigation">
              <div>
                <div className="sidebar-title">Navegación</div>
                <button className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  Dashboard General
                </button>
                <button className={`sidebar-nav-item ${activeTab === 'puertas' ? 'active' : ''}`} onClick={() => setActiveTab('puertas')}>
                  Estado de Puertas
                </button>
                <button className={`sidebar-nav-item ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
                  Historial de Accesos
                </button>
                <button className={`sidebar-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`} onClick={() => setActiveTab('usuarios')}>
                  Usuarios y Permisos
                </button>
              </div>
            </aside>

            {/* Contenido de la Vista */}
            <main className="panel-main-content">

              {/* ---------------- PESTAÑA 1: DASHBOARD ---------------- */}
              {activeTab === 'dashboard' && (
                <div className="tab-dashboard-view">
                  <div className="section-top-header">
                    <div>
                      <span className="section-badge-tag">Monitoreo en Tiempo Real</span>
                      <h2>Métricas y Registro de Operación</h2>
                      <p className="section-desc">Supervisión centralizada de puntos de acceso y auditoría de eventos.</p>
                    </div>
                    <div>
                      <button onClick={fetchHistorial}>Actualizar Datos</button>
                    </div>
                  </div>

                  {/* KPIs */}
                  <div className="kpi-grid wireframe-target" data-figma-label="Auto-Layout: KPI_Cards_Grid">
                    <div className="kpi-card">
                      <div className="kpi-number">{totalAccesos}</div>
                      <div className="kpi-label">Total Eventos Registrados</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-number success">{permitidosCount}</div>
                      <div className="kpi-label">Accesos Autorizados</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-number danger">{denegadosCount}</div>
                      <div className="kpi-label">Intentos Denegados</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-number">4/4</div>
                      <div className="kpi-label">Áreas Monitoreadas</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-number">{queryLatency ? `${queryLatency}ms` : '15ms'}</div>
                      <div className="kpi-label">Latencia del Servidor</div>
                    </div>
                  </div>

                  {/* Estado de Puertas basado en los registros reales (sin cápsulas/fondos artificiales) */}
                  <div className="section-subtitle">
                    <span>Estado Reciente de Puertas</span>
                    <button className="ghost" style={{ color: '#ff4b2b', padding: 0 }} onClick={() => setActiveTab('puertas')}>
                      Ver detalle de puertas →
                    </button>
                  </div>

                  <div className="doors-grid-quick wireframe-target" data-figma-label="Auto-Layout: Quick_Doors_List">
                    {areas.map((area) => {
                      const areaId = area.id;
                      const cfg = area;
                      const ultimoEv = getUltimoEventoPuerta(areaId);
                      const fueConcedido = ultimoEv ? ultimoEv.acceso_concedido : null;

                      let estadoClase = 'sin-registros';
                      let estadoTexto = 'Sin registros';
                      if (ultimoEv) {
                        estadoClase = fueConcedido ? 'permitido' : 'denegado';
                        estadoTexto = fueConcedido ? 'Acceso Permitido' : 'Acceso Denegado';
                      }

                      return (
                        <div key={areaId} className="door-card-quick">
                          <div className="door-quick-top">
                            <span className="door-area-text">Área 0{areaId}</span>
                            <div className="door-mini-leds">
                              <span className={`mini-led-indicator ${fueConcedido === true ? 'green-on' : ''}`}></span>
                              <span className={`mini-led-indicator ${fueConcedido === false ? 'red-on' : ''}`}></span>
                            </div>
                          </div>
                          <h4 className="door-name">{cfg.descripcion || cfg.nombre}</h4>
                          <div className="door-loc">{cfg.ubicacion}</div>

                          {/* Texto limpio sin color de fondo alrededor */}
                          <span className={`status-text-clean ${estadoClase}`}>
                            {estadoTexto}
                          </span>

                          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                            {ultimoEv ? `Último UID: ${ultimoEv.codigo_rfid_leido}` : 'Esperando lectura'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tabla de Registros Recientes */}
                  <div className="logs-container-box wireframe-target" data-figma-label="Component: Recent_Logs_Table">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <h3 style={{ fontSize: 15, color: '#333' }}>Últimos Registros de Acceso</h3>
                      </div>
                      <button className="ghost" style={{ color: '#ff4b2b' }} onClick={() => setActiveTab('historial')}>
                        Ver historial completo →
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="logs-data-table">
                        <thead>
                          <tr>
                            <th>Fecha y Hora</th>
                            <th>Área / Puerta</th>
                            <th>Código RFID Leído</th>
                            <th>Tarjeta Asignada</th>
                            <th>Resultado</th>
                            <th>Motivo</th>
                            <th>Sincronizado Offline</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historial.slice(0, 5).map((row) => (
                            <tr key={row.id}>
                              <td>{new Date(row.fecha_hora).toLocaleTimeString()}</td>
                              <td>{getAreaObj(row.area_id)?.descripcion || `Área ${row.area_id}`}</td>
                              <td><code>{row.codigo_rfid_leido}</code></td>
                              <td>{row.tarjeta_codigo ? <code>{row.tarjeta_codigo}</code> : 'Sin Asignar'}</td>
                              <td>
                                {/* Texto plano limpio sin fondo alrededor */}
                                <span className={row.acceso_concedido ? 'text-status-ok' : 'text-status-deny'}>
                                  {row.acceso_concedido ? 'Permitido' : 'Denegado'}
                                </span>
                              </td>
                              <td><small>{row.motivo || 'Verificación'}</small></td>
                              <td><small>{row.sincronizado_offline ? 'Sí' : 'No'}</small></td>
                            </tr>
                          ))}
                          {historial.length === 0 && (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '24px 12px', color: '#888' }}>
                                Sin eventos de acceso registrados en la base de datos.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- PESTAÑA 2: ESTADO DE PUERTAS ---------------- */}
              {activeTab === 'puertas' && (
                <div className="tab-puertas-view">
                  <div className="section-top-header">
                    <div>
                      <span className="section-badge-tag">Supervisión de Puntos de Control</span>
                      <h2>Detalle de Puertas Perimetrales</h2>
                      <p className="section-desc">Monitoreo del último estado registrado por punto de control.</p>
                    </div>
                    <div>
                      <button onClick={fetchHistorial}>Actualizar Estado</button>
                    </div>
                  </div>

                  <div className="doors-detailed-grid wireframe-target" data-figma-label="Auto-Layout: Doors_Control_Matrix">
                    {areas.map((area) => {
                      const areaId = area.id;
                      const cfg = area;
                      const ultimoEv = getUltimoEventoPuerta(areaId);
                      const fueConcedido = ultimoEv ? ultimoEv.acceso_concedido : null;

                      let estadoClase = 'sin-registros';
                      let estadoTexto = 'Sin actividad';
                      if (ultimoEv) {
                        estadoClase = fueConcedido ? 'permitido' : 'denegado';
                        estadoTexto = fueConcedido ? 'Permitido' : 'Denegado';
                      }

                      return (
                        <div key={areaId} className="door-full-card">
                          <div>
                            <div className="door-full-top">
                              <span className="door-area-text">ÁREA 0{areaId}</span>
                              <span className={`status-text-clean ${estadoClase}`}>
                                {estadoTexto}
                              </span>
                            </div>
                            <h3 className="door-full-title">{cfg.descripcion || cfg.nombre}</h3>
                            <div className="door-loc" style={{ marginBottom: 14 }}>{cfg.ubicacion}</div>

                            {/* Indicadores Visuales Limpios */}
                            <div className="virtual-actuators-box">
                              <div className="actuator-label">Indicador de Estado:</div>
                              <div className="leds-container">
                                <div className="led-item">
                                  <div className={`led-lamp green ${fueConcedido === true ? 'glow' : ''}`}></div>
                                  <span className="led-text">Permitido</span>
                                </div>
                                <div className="led-item">
                                  <div className={`led-lamp red ${fueConcedido === false ? 'glow' : ''}`}></div>
                                  <span className="led-text">Denegado</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ background: '#fdfdfd', borderLeft: '3px solid #ff4b2b', padding: '10px 14px', fontSize: 11, marginBottom: 14 }}>
                              <span style={{ color: '#888', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Último Registro:</span>
                              <strong>UID: {ultimoEv ? ultimoEv.codigo_rfid_leido : 'Ninguno'}</strong>
                              <div style={{ color: '#666', marginTop: 4 }}>
                                {ultimoEv ? `${new Date(ultimoEv.fecha_hora).toLocaleString()} — ${ultimoEv.motivo}` : 'Sin lecturas reportadas'}
                              </div>
                            </div>
                          </div>

                          <div style={{ fontSize: 11, color: '#888', borderTop: '1px solid #eee', paddingTop: 10 }}>
                            Identificador: <strong>{cfg.nombre}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ---------------- PESTAÑA 3: HISTORIAL DE ACCESOS ---------------- */}
              {activeTab === 'historial' && (
                <div className="tab-historial-view">
                  <div className="section-top-header">
                    <div>
                      <span className="section-badge-tag">Auditoría de Accesos</span>
                      <h2>Historial Completo de Registros</h2>
                      <p className="section-desc">Auditoría detallada de todos los eventos registrados en el sistema.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={fetchHistorial}>Refrescar</button>
                      <button className="btn-secondary" onClick={exportarCSV}>Exportar CSV</button>
                    </div>
                  </div>

                  {/* Filtros Limpios */}
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
                          <option key={a.id} value={a.id}>{a.descripcion || a.nombre}</option>
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

                  {/* Tabla completa de logs */}
                  <div className="logs-container-box wireframe-target" data-figma-label="Table: Historial_Acceso">
                    <div style={{ overflowX: 'auto' }}>
                      <table className="logs-data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Fecha y Hora</th>
                            <th>Área / Puerta</th>
                            <th>Código RFID Leído</th>
                            <th>Tarjeta Código</th>
                            <th>Resultado</th>
                            <th>Motivo / Auditoría</th>
                            <th>Offline</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historialFiltrado.map((row) => (
                            <tr key={row.id}>
                              <td>#{row.id}</td>
                              <td><strong>{new Date(row.fecha_hora).toLocaleString()}</strong></td>
                              <td>{getAreaObj(row.area_id)?.descripcion || getAreaObj(row.area_id)?.nombre || `Área ${row.area_id}`}</td>
                              <td><code>{row.codigo_rfid_leido}</code></td>
                              <td>{row.tarjeta_codigo ? <code>{row.tarjeta_codigo}</code> : 'Sin Asignar'}</td>
                              <td>
                                {/* Texto limpio sin cápsula alrededor */}
                                <span className={row.acceso_concedido ? 'text-status-ok' : 'text-status-deny'}>
                                  {row.acceso_concedido ? 'Permitido' : 'Denegado'}
                                </span>
                              </td>
                              <td><small>{row.motivo || 'Validación'}</small></td>
                              <td><small>{row.sincronizado_offline ? 'Sí' : 'No'}</small></td>
                            </tr>
                          ))}
                          {historialFiltrado.length === 0 && (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#888' }}>
                                No se encontraron registros coincidentes con los filtros aplicados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 12, textAlign: 'right', fontSize: 11, color: '#888' }}>
                      Mostrando {historialFiltrado.length} de {historial.length} registros
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- PESTAÑA 4: USUARIOS Y PERMISOS ---------------- */}
              {activeTab === 'usuarios' && (
                <div className="tab-usuarios-view">
                  <div className="section-top-header">
                    <div>
                      <span className="section-badge-tag">Control de Identidades</span>
                      <h2>Usuarios, Llaves Maestras y Permisos</h2>
                      <p className="section-desc">Entidades registradas y permisos de acceso por punto de control.</p>
                    </div>
                    <div>
                      <button onClick={fetchTablasAuxiliares}>Recargar</button>
                    </div>
                  </div>

                  {/* Tabla de Usuarios */}
                  <div className="logs-container-box mb-20 wireframe-target" data-figma-label="Table: Usuarios_Registrados">
                    <h3 style={{ fontSize: 15, marginBottom: 12 }}>Usuarios Registrados</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="logs-data-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Nombre Completo</th>
                            <th>Rol</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.map((u) => (
                            <tr key={u.id}>
                              <td>#{u.id}</td>
                              <td><strong>{u.nombre_completo}</strong></td>
                              <td><span className={u.rol === 'admin' ? 'text-rol-admin' : 'text-rol-user'}>{u.rol}</span></td>
                              <td><span className={u.esta_activo ? 'text-status-ok' : 'text-status-deny'}>{u.esta_activo ? 'Activo' : 'Inactivo'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla de Tarjetas y Llaves Maestras */}
                  <div className="logs-container-box mb-20 wireframe-target" data-figma-label="Table: Tarjetas_RFID">
                    <h3 style={{ fontSize: 15, marginBottom: 12 }}>Tarjetas RFID & Llaves Maestras</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="logs-data-table">
                        <thead>
                          <tr>
                            <th>Código RFID (UID)</th>
                            <th>Usuario Asignado</th>
                            <th>Tipo de Llave</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tarjetas.map((t) => {
                            const u = usuarios.find((usr) => usr.id === t.usuario_id);
                            return (
                              <tr key={t.codigo_rfid}>
                                <td><code>{t.codigo_rfid}</code></td>
                                <td>{u ? u.nombre_completo : `Usuario #${t.usuario_id}`}</td>
                                <td>
                                  <span className={t.es_llave_maestra ? 'text-rol-admin' : 'text-rol-user'}>
                                    {t.es_llave_maestra ? 'Llave Maestra' : 'Estándar'}
                                  </span>
                                </td>
                                <td>
                                  <span className={t.esta_activa ? 'text-status-ok' : 'text-status-deny'}>
                                    {t.esta_activa ? 'Activa' : 'Inactiva'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabla de Permisos por Área */}
                  <div className="logs-container-box wireframe-target" data-figma-label="Table: Permisos_Areas">
                    <h3 style={{ fontSize: 15, marginBottom: 12 }}>Permisos de Acceso</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="logs-data-table">
                        <thead>
                          <tr>
                            <th>Usuario</th>
                            <th>Área Autorizada</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {permisos.map((p, idx) => {
                            const u = usuarios.find((usr) => usr.id === p.usuario_id);
                            return (
                              <tr key={idx}>
                                <td>{u ? u.nombre_completo : `Usuario #${p.usuario_id}`}</td>
                                <td>{getAreaObj(p.area_id)?.descripcion || getAreaObj(p.area_id)?.nombre || `Área ${p.area_id}`}</td>
                                <td>
                                  <span className={p.esta_activo ? 'text-status-ok' : 'text-status-deny'}>
                                    {p.esta_activo ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      )}

    </div>
  );
}
