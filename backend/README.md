# Backend / Base de Datos - LOGTT IoT

Módulo para la persistencia, seguridad RLS (Row Level Security), datos de prueba, enrolamiento de tarjetas RFID y scripts de auditoría/diagnóstico en Supabase (PostgreSQL).

## 📁 Estructura del Backend

```text
backend/
├── sql/
│   ├── migracion_tarjeta_por_zona.sql # Migración: asignar tarjetas por zona física y políticas RLS
│   ├── create_sesion_enrolamiento.sql # Migración: tabla sesion_enrolamiento y políticas RLS
│   ├── seed_real_supabase.sql         # Inserciones iniciales (usuarios, áreas, llaves maestras, permisos)
│   ├── diagnostico_lectura.sql        # Script de diagnóstico de solo lectura para permisos RLS
│   └── fix_rls_policies.sql           # Corrección y habilitación de políticas RLS públicas
├── scripts/
│   └── check-supabase.mjs             # Comprobación de conectividad y lectura desde Node.js
└── README.md
```

## 🗄️ Esquema de Tablas (PostgreSQL / Supabase)

1. **`area`**: Representa los puntos de acceso / puertas / zonas monitoreadas (`id`, `nombre`, `descripcion`, `ubicacion`).
2. **`usuario`**: Usuarios y operadores del sistema (`id`, `nombre_completo`, `rol`, `esta_activo`).
3. **`tarjeta`**: Tarjetas RFID asignadas por zona (`codigo_rfid`, `usuario_id`, `area_id`, `es_llave_maestra`, `esta_activa`).
4. **`permiso`**: Matriz de permisos de usuarios por área / zona autorizada (`usuario_id`, `area_id`, `esta_activo`).
5. **`historial_acceso`**: Registro de auditoría de cada intento de acceso (`id`, `fecha_hora`, `area_id`, `codigo_rfid_leido`, `tarjeta_codigo`, `acceso_concedido`, `motivo`, `sincronizado_offline`).
6. **`sesion_enrolamiento`**: Sesiones temporales para registrar tarjetas desde lectores RFID (`id`, `area_id`, `uid_detectado`, `estado`, `creado_en`, `expira_en`).

## 🔄 Flujo de Enrolamiento desde Lector (Node-RED / Hardware)

1. **El operador pulsa "Iniciar Lectura"** en el Dashboard para un área/puerta (`area_id = 1`).
2. El frontend ejecuta un **UPSERT** en `sesion_enrolamiento`:
   - `estado = 'esperando'`
   - `uid_detectado = NULL`
   - `expira_en = NOW() + INTERVAL '30 seconds'`
3. **Cuando se pasa una tarjeta física por el lector:**
   - Node-RED consulta si hay una sesión activa:
     ```sql
     UPDATE sesion_enrolamiento
     SET estado = 'detectada', uid_detectado = 'B5C6D7E8'
     WHERE area_id = 1 
       AND estado = 'esperando' 
       AND expira_en > NOW()
     RETURNING *;
     ```
   - **Si la consulta actualiza una fila:** Hay sesión de enrolamiento. Node-RED **NO** evalúa acceso ni guarda en `historial_acceso`.
   - **Si no actualiza ninguna fila (0 filas):** No hay sesión activa. Procesa la lectura normal, verifica permisos y registra en `historial_acceso`.
4. El dashboard recibe el cambio vía **Supabase Realtime** (con respaldo de polling cada 1 s), rellena el UID en solo lectura y permite seleccionar el titular.

## ⚙️ Simulación Manual con cURL

### 1. Simular detección de tarjeta en sesión de enrolamiento (Lector Puerta 1):
```bash
curl -X PATCH "https://azsjsofedwlgelcdpmpi.supabase.co/rest/v1/sesion_enrolamiento?area_id=eq.1&estado=eq.esperando" \
  -H "apikey: <TU_ANON_KEY>" \
  -H "Authorization: Bearer <TU_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"estado\": \"detectada\", \"uid_detectado\": \"B5C6D7E8\"}"
```

### 2. Simular lectura normal (sin enrolamiento, genera evento en log):
```bash
curl -X POST "https://azsjsofedwlgelcdpmpi.supabase.co/rest/v1/historial_acceso" \
  -H "apikey: <TU_ANON_KEY>" \
  -H "Authorization: Bearer <TU_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"codigo_rfid_leido\": \"01020304\", \"tarjeta_codigo\": \"01020304\", \"area_id\": 1, \"acceso_concedido\": true, \"motivo\": \"Acceso autorizado puerta principal\"}"
```

## ⚙️ Ejecución de Diagnóstico

Para validar la conexión con Supabase desde la terminal raíz:
```bash
npm run check:supabase
```
