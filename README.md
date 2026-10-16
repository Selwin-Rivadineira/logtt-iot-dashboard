# LOGTT | Sistema de Control y Monitoreo de Acceso IoT

Plataforma web para auditoría de accesos y monitoreo en tiempo real de puertas perimetrales, integrada con microcontroladores ESP32 (Wokwi) y base de datos relacional Supabase (PostgreSQL).

Desarrollado para la entrega de Sprint:
- **Autor:** Rivadineira Medrano Selwin
- **Tarea 1:** Inserción de datos de prueba en la base de datos (usuarios, UIDs de llaves maestras y permisos iniciales) consumidos por el panel de control.
- **Tarea 2:** Dashboard de monitoreo, visualización de logs en tiempo real y estado de puertas perimetrales.

---

## 🛠 Tecnologías Utilizadas

- **Frontend:** React 19 + Vite
- **Estilos:** Vanilla CSS con diseño moderno, sobrio y responsivo (sin emojis, visualización corporativa)
- **Base de Datos:** Supabase (PostgreSQL) con políticas Row Level Security (RLS) habilitadas
- **IoT Firmware / Simulación:** Wokwi ESP32 con 4 lectores RFID MFRC522 vía bus SPI
- **Hosting / Despliegue:** Optimizado para Vercel con configuración SPA (`vercel.json`)

---

## 📂 Estructura del Repositorio

```text
├── public/                 # Favicons y recursos públicos
├── src/
│   ├── App.jsx             # Vista de autenticación y Dashboard de monitoreo
│   ├── App.css             # Estilos sobrios y diseño responsivo
│   ├── supabaseClient.js   # Cliente Supabase con fallback integrado
│   └── main.jsx            # Punto de entrada de la aplicación
├── seed_real_supabase.sql  # Script SQL completo (Tarea 1: esquema, datos y políticas RLS)
├── vercel.json             # Configuración de rutas para despliegue en Vercel
├── .env.example            # Plantilla de variables de entorno
└── package.json
```

---

## 🗄️ Base de Datos (Tarea 1)

El archivo `seed_real_supabase.sql` contiene las sentencias DDL y DML para poblar la base de datos en Supabase:
- **Tablas:** `area`, `usuario`, `tarjeta`, `permiso`, `historial_acceso`.
- **Llave Maestra Global:** UID `01020304` asignado al administrador principal.
- **Políticas RLS:** Políticas de lectura pública para SELECT y consulta por parte del dashboard.
- **Consulta Única:** El dashboard consume los registros mediante una única consulta SQL ordenada cronológicamente a `historial_acceso`.

---

## 🚀 Despliegue en Vercel

1. Sube este repositorio a tu cuenta de GitHub.
2. Inicia sesión en [Vercel](https://vercel.com/) e importa este repositorio.
3. El proyecto incluye `vercel.json` preconfigurado:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. *(Opcional)* En la sección **Environment Variables** de Vercel puedes configurar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   *(Si no se configuran, la aplicación cuenta con fallback automático predefinido).*

---

## 💻 Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilar para producción
npm run build
```
