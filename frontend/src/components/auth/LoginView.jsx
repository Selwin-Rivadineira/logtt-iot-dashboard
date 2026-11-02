import React, { useState } from 'react';

export default function LoginView({ onLoginSuccess }) {
  const [isSignUpActive, setIsSignUpActive] = useState(false);

  return (
    <div className="login-view-wrapper">
      <div
        className={`login-card-container ${isSignUpActive ? 'right-panel-active' : ''} wireframe-target`}
        data-figma-label="Frame: Auth_Double_Slider"
      >
        {/* Formulario Registro */}
        <div className="login-form-container sign-up-container">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLoginSuccess();
            }}
          >
            <h1>Crear Cuenta</h1>
            <span>Registro de operador institucional</span>
            <input type="text" placeholder="Nombre Completo" defaultValue="Usuario Prueba" />
            <input type="email" placeholder="Email institucional" defaultValue="prueba@logtt.iot" />
            <input type="password" placeholder="Contraseña de acceso" defaultValue="••••••••" />
            <button type="submit">Registrar</button>
            <button
              type="button"
              className="mobile-switch-auth-btn"
              onClick={() => setIsSignUpActive(false)}
            >
              ¿Ya tienes cuenta? Inicia Sesión
            </button>
          </form>
        </div>

        {/* Formulario Iniciar Sesión */}
        <div className="login-form-container sign-in-container">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLoginSuccess();
            }}
          >
            <h1>Iniciar Sesión</h1>
            <span>Control y monitoreo de acceso</span>
            <input type="email" placeholder="Email" defaultValue="selwin.rivadineira@logtt.iot" />
            <input type="password" placeholder="Contraseña" defaultValue="admin123" />
            <a href="#" className="forgot-link">
              ¿Olvidaste tu contraseña?
            </a>
            <button type="submit">Iniciar Sesión</button>
            <button
              type="button"
              className="mobile-switch-auth-btn"
              onClick={() => setIsSignUpActive(true)}
            >
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
              <button className="ghost" onClick={() => setIsSignUpActive(false)}>
                Iniciar Sesión
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>LOGTT IoT</h1>
              <p>Plataforma de monitoreo perimetral y auditoría de accesos en tiempo real.</p>
              <button className="ghost" onClick={() => setIsSignUpActive(true)}>
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
