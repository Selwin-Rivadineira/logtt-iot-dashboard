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
│   ├── supabaseClient.js   # Cliente Supabase compartido y configuración
│   ├── dashboardSync.js    # Lecturas paginadas, Realtime y sondeo
│   ├── useDashboardData.js # Ciclo de vida de la sincronización en React
│   └── main.jsx            # Punto de entrada de la aplicación
├── seed_real_supabase.sql  # Datos de prueba y políticas (no es una migración de reparación)
├── supabase/diagnostico_lectura.sql # Diagnóstico de solo lectura
├── scripts/check-supabase.mjs      # Comprobación de acceso desde la API pública
├── vercel.json             # Configuración de rutas para despliegue en Vercel
├── .env.example            # Plantilla de variables de entorno
└── package.json
```

---

## 🗄️ Base de Datos (Tarea 1)

El archivo `seed_real_supabase.sql` contiene inserciones de prueba y políticas para tablas ya existentes. No ejecutarlo para reparar la sincronización: modifica datos y añade políticas de acceso público.
- **Tablas:** `area`, `usuario`, `tarjeta`, `permiso`, `historial_acceso`.
- **Llave Maestra Global:** UID `01020304` asignado al administrador principal.
- **Políticas RLS:** Políticas de lectura pública para SELECT y consulta por parte del dashboard.
- **Consultas del panel:** Se leen las cinco tablas; el historial se ordena por `fecha_hora DESC, id DESC`.

---

## 🚀 Despliegue en Vercel

1. Sube este repositorio a tu cuenta de GitHub.
2. Inicia sesión en [Vercel](https://vercel.com/) e importa este repositorio.
3. El proyecto incluye `vercel.json` preconfigurado:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. En la sección **Environment Variables** de Vercel configura ambos valores del mismo proyecto:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   Las variables del despliegue tienen prioridad sobre valores antiguos de localStorage. Si falta una de las dos, el panel muestra un error. Si no se define ninguna, se usa un par completo de localStorage o el proyecto predeterminado `azsjsofedwlgelcdpmpi`.
5. Después de cambiar código o variables, genera un nuevo despliegue. Editar la carpeta local no actualiza por sí solo una página ya publicada.

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

## Qué datos consume cada pantalla

Todas las consultas se hacen al esquema `public` del proyecto mostrado en el panel. Se usa `select('*')` con paginación, sin el límite anterior de 100 eventos.

| Tabla | Campos usados en pantalla | Dónde se muestra |
| --- | --- | --- |
| `historial_acceso` | `id`, `fecha_hora`, `area_id`, `codigo_rfid_leido`, `tarjeta_codigo`, `acceso_concedido`, `motivo`, `sincronizado_offline` | Métricas, últimos 5 eventos, historial completo y último evento de cada puerta |
| `area` | `id`, `nombre`, `descripcion`, `ubicacion` (si existe) | Puertas, contador de áreas, filtros y nombres de áreas |
| `usuario` | `id`, `nombre_completo`, `rol`, `esta_activo` | Usuarios y nombres asociados a tarjetas/permisos |
| `tarjeta` | `codigo_rfid`, `usuario_id`, `es_llave_maestra`, `esta_activa` | Tarjetas RFID y llaves maestras |
| `permiso` | `usuario_id`, `area_id`, `esta_activo` | Permisos por usuario y área |

Las relaciones se resuelven en el navegador por `area_id → area.id` y `usuario_id → usuario.id`. Los indicadores de puertas representan el último evento de acceso registrado; no prueban si el lector está conectado ni la posición física de la puerta.

Las cinco tablas se vuelven a consultar cada 2 segundos y al recibir cambios de Realtime, recuperar la conexión, volver a la ventana o pulsar actualizar. Realtime requiere que las tablas estén en `supabase_realtime`; el sondeo sigue funcionando sin esa publicación. También se reflejan listas vacías y eliminaciones. Los errores se muestran con el nombre de la tabla, sin sustituirlos por registros de ejemplo.

## Diagnóstico cuando Supabase tiene datos pero la web está vacía

1. Ejecuta `npm run check:supabase` para ver el proyecto y cuántas filas permite leer la clave de `.env`. El comando no escribe en la base ni imprime la clave.
2. Comprueba que el identificador del proyecto coincida con el que ves en Supabase. Cambia juntos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, y reinicia Vite si editas `.env`.
3. Ejecuta `supabase/diagnostico_lectura.sql` en el SQL Editor de ese proyecto para comparar filas existentes, privilegios, políticas RLS y filas visibles para `anon`.
4. Si el editor ve filas y `anon` no, el acceso de lectura está restringido por las políticas. El formulario actual de entrar/registrarse solo abre el panel: **no crea cuentas ni inicia sesiones de Supabase Auth**. Por eso las consultas usan el rol `anon`. Una política para `authenticated` no habilita este panel por sí sola.
5. Antes de cambiar políticas, define quién debe acceder: para un panel privado hay que integrar Supabase Auth y políticas de lectura para los operadores autorizados. Permitir `SELECT` a `anon` haría públicos los datos accesibles a esa clave. No se cambian esas políticas automáticamente ni se usa una clave `service_role` en el frontend.

Verificación realizada el 30/10/2026: la clave publicable respondió HTTP 200 y cero filas visibles. Al comparar desde Node con la clave secreta del mismo proyecto se leyeron 23 accesos, 4 áreas, 2 usuarios, 2 tarjetas y 2 permisos. Los registros existen; el acceso de la conexión pública está restringido. La clave secreta se conserva únicamente en `.env` como `SUPABASE_SECRET_KEY`, sin prefijo `VITE_`, y el frontend usa la clave publicable. El inicio y la compilación de Vite rechazan claves secretas en variables `VITE_`. No se han cambiado políticas RLS ni agregado un backend que use la clave secreta.

Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) y [cambios de Postgres con Realtime](https://supabase.com/docs/guides/realtime/postgres-changes).

## Comprobaciones

```bash
npm test
npm run lint
npm run build
npm run check:supabase
```

Las pruebas de sincronización usan datos simulados: verifican inserciones, cambios, eliminación de la última fila, paginación, errores, recuperación y limpieza de suscripciones sin modificar el historial real.
