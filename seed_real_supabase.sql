-- =====================================================================
-- SISTEMA LOGTT - POBLADO DE DATOS REALES EN SUPABASE
-- Proyecto: azsjsofedwlgelcdpmpi
-- Tablas reales: area, usuario, tarjeta, permiso, historial_acceso
-- Ejecutar en: https://supabase.com/dashboard/project/azsjsofedwlgelcdpmpi/sql/new
-- =====================================================================

-- 1. POBLAR TABLA 'area' (4 Puertas del ESP32 Wokwi)
INSERT INTO area (id, nombre, descripcion) VALUES
(1, 'Puerta 01 - Norte', 'Acceso Principal (Lector Norte | SS: GPIO 5 | LED Verde: GPIO 12 | LED Rojo: GPIO 13)'),
(2, 'Puerta 02 - Sur',   'Datacenter (Lector Sur | SS: GPIO 21 | LED Verde: GPIO 25 | LED Rojo: GPIO 26)'),
(3, 'Puerta 03 - Este',  'Laboratorio (Lector Este | SS: GPIO 27 | LED Verde: GPIO 32 | LED Rojo: GPIO 33)'),
(4, 'Puerta 04 - Oeste', 'Almacén de Suministros (Lector Oeste | SS: GPIO 14 | LED Verde: GPIO 16 | LED Rojo: GPIO 17)')
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion;

-- 2. POBLAR TABLA 'usuario'
INSERT INTO usuario (id, nombre_completo, rol) VALUES
(1, 'Selwin Rivadineira', 'Administrador'),
(2, 'Andrés Chávez',      'Administrador'),
(3, 'Lukas Quiroga',      'Operador'),
(4, 'Thomas Mamani',      'Operador'),
(5, 'Josermando Cayo',    'Operador'),
(6, 'Carlos Morales',     'Guardia'),
(7, 'Mariana López',      'Visitante')
ON CONFLICT (id) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo, rol = EXCLUDED.rol;

-- 3. POBLAR TABLA 'tarjeta' (UIDs compatibles con MFRC522 en Wokwi / ESP32)
INSERT INTO tarjeta (codigo_rfid, usuario_id) VALUES
('01020304', 1), -- Selwin Rivadineira (Llave Maestra Global)
('A1B2C3D4', 2), -- Andrés Chávez (Llave Maestra Firmware)
('73A2B19F', 3), -- Lukas Quiroga (Operador BD)
('4E5F6A7B', 4), -- Thomas Mamani (Integrador Node-RED)
('C8D9E0F1', 5), -- Josermando Cayo (Admin VPS Cloud)
('11223344', 6)  -- Carlos Morales (Pase Guardia)
ON CONFLICT (codigo_rfid) DO NOTHING;

-- 4. POBLAR TABLA 'permiso' (Matriz de acceso por área)
INSERT INTO permiso (usuario_id, area_id) VALUES
-- Selwin (Admin) -> Acceso a las 4 áreas
(1, 1), (1, 2), (1, 3), (1, 4),
-- Andrés (Admin) -> Acceso a las 4 áreas
(2, 1), (2, 2), (2, 3), (2, 4),
-- Lukas (Operador) -> Áreas 1 (Norte), 3 (Este), 4 (Oeste)
(3, 1), (3, 3), (3, 4),
-- Thomas (Operador) -> Áreas 1 (Norte), 2 (Sur)
(4, 1), (4, 2),
-- Carlos (Guardia) -> Área 1 (Norte)
(6, 1)
ON CONFLICT DO NOTHING;

-- 5. POBLAR REGISTROS DE PRUEBA EN 'historial_acceso'
INSERT INTO historial_acceso (codigo_rfid_leido, tarjeta_codigo, area_id, fecha_hora, acceso_concedido, motivo) VALUES
('01020304', '01020304', 1, NOW() - INTERVAL '4 minutes',  true,  'Llave Maestra Global autorizada'),
('A1B2C3D4', 'A1B2C3D4', 2, NOW() - INTERVAL '12 minutes', true,  'Acceso autorizado a Datacenter'),
('F4E3D2C1', NULL,       2, NOW() - INTERVAL '28 minutes', false, 'UID no registrado en sistema'),
('73A2B19F', '73A2B19F', 3, NOW() - INTERVAL '45 minutes', true,  'Permiso de Laboratorio concedido'),
('4E5F6A7B', '4E5F6A7B', 4, NOW() - INTERVAL '1 hour',     false, 'Acceso denegado: sin permiso en almacén'),
('11223344', '11223344', 1, NOW() - INTERVAL '1 hour 15m', true,  'Guardia de turno en puerta principal'),
('01020304', '01020304', 3, NOW() - INTERVAL '2 hours',    true,  'Mantenimiento de hardware RFID'),
('99887766', NULL,       2, NOW() - INTERVAL '3 hours',    false, 'Tarjeta revocada / no válida'),
('C8D9E0F1', 'C8D9E0F1', 4, NOW() - INTERVAL '4 hours',    true,  'Retiro de equipamiento de red'),
('A1B2C3D4', 'A1B2C3D4', 1, NOW() - INTERVAL '5 hours',    true,  'Ingreso matutino autorizado');

-- 6. HABILITAR PERMISOS DE LECTURA PÚBLICA PARA EL DASHBOARD
ALTER TABLE historial_acceso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica historial_acceso" ON historial_acceso FOR SELECT USING (true);
CREATE POLICY "Insercion publica historial_acceso" ON historial_acceso FOR INSERT WITH CHECK (true);

ALTER TABLE area ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica area" ON area FOR SELECT USING (true);

ALTER TABLE usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica usuario" ON usuario FOR SELECT USING (true);

ALTER TABLE tarjeta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica tarjeta" ON tarjeta FOR SELECT USING (true);

ALTER TABLE permiso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica permiso" ON permiso FOR SELECT USING (true);

-- =====================================================================
-- CONSULTA SQL ÚNICA CONSUMIDA POR EL DASHBOARD:
-- =====================================================================
-- SELECT id, codigo_rfid_leido, tarjeta_codigo, area_id, fecha_hora, acceso_concedido, motivo 
-- FROM historial_acceso ORDER BY fecha_hora DESC;
