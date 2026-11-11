# Backend / Base de Datos - LOGTT IoT

Módulo para la persistencia, seguridad RLS (Row Level Security), datos de prueba y scripts de auditoría/diagnóstico en Supabase (PostgreSQL).

## 📁 Estructura del Backend

```text
backend/
├── sql/
│   ├── seed_real_supabase.sql         # Inserciones iniciales (usuarios, áreas, llaves maestras, permisos)
│   ├── fix_usuario_rls.sql            # Permisos de inserción/actualización para usuarios
│   ├── diagnostico_lectura.sql        # Script de diagnóstico de solo lectura para permisos RLS
│   └── fix_rls_policies.sql           # Corrección y habilitación de políticas RLS públicas
├── scripts/
│   └── check-supabase.mjs             # Comprobación de conectividad y lectura desde Node.js
└── README.md
```

## 🗄️ Esquema de Tablas (PostgreSQL / Supabase)

1. **`area`**: Representa los puntos de acceso / puertas / zonas monitoreadas (`id`, `nombre`, `descripcion`, `ubicacion`).
2. **`usuario`**: Usuarios y operadores del sistema (`id`, `nombre_completo`, `rol`, `esta_activo`).
3. **`tarjeta`**: Tarjetas RFID asignadas (`codigo_rfid`, `usuario_id`, `es_llave_maestra`, `esta_activa`).
4. **`permiso`**: Matriz de permisos de usuarios por área / zona autorizada (`usuario_id`, `area_id`, `esta_activo`).
5. **`historial_acceso`**: Registro de auditoría de cada intento de acceso (`id`, `fecha_hora`, `area_id`, `codigo_rfid_leido`, `tarjeta_codigo`, `acceso_concedido`, `motivo`, `sincronizado_offline`).

## ⚙️ Simulación Manual con cURL

### Simular lectura de tarjeta en punto de acceso:
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
