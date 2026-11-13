import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarUID,
  validarFormatoUID,
  buscarUsuarioPorNombre,
  registrarTarjeta,
  actualizarTarjeta,
} from './tarjetasService.js';

test('normalizarUID limpia caracteres no hexadecimales y convierte a mayúsculas', () => {
  assert.equal(normalizarUID('01:02:03:04'), '01020304');
  assert.equal(normalizarUID(' a1-b2-c3-d4 '), 'A1B2C3D4');
  assert.equal(normalizarUID('4e 5f 6a 7b'), '4E5F6A7B');
  assert.equal(normalizarUID(null), '');
  assert.equal(normalizarUID(undefined), '');
});

test('validarFormatoUID valida cadenas hexadecimales pares válidas', () => {
  const ok8 = validarFormatoUID('01020304');
  assert.equal(ok8.valido, true);
  assert.equal(ok8.normalizado, '01020304');

  const ok14 = validarFormatoUID('04:12:34:56:78:9A:BC');
  assert.equal(ok14.valido, true);
  assert.equal(ok14.normalizado, '04123456789ABC');

  const vacio = validarFormatoUID('');
  assert.equal(vacio.valido, false);

  const impar = validarFormatoUID('A1B');
  assert.equal(impar.valido, false);

  const noHex = validarFormatoUID('ZZZZZZZZ');
  assert.equal(noHex.valido, false);
});

test('registrarTarjeta rechaza duplicados con status 409 y permite inserción limpia', async () => {
  const tarjetasDB = [{ codigo_rfid: '01020304', usuario_id: 1, area_id: 1 }];
  const permisosDB = [];

  const fakeClient = {
    from(tabla) {
      if (tabla === 'tarjeta') {
        return {
          select(_cols) {
            return {
              eq(campo, valor) {
                return {
                  async maybeSingle() {
                    const found = tarjetasDB.find((t) => t[campo] === valor);
                    return { data: found || null, error: null };
                  },
                };
              },
            };
          },
          insert(rows) {
            return {
              select() {
                return {
                  async single() {
                    tarjetasDB.push(rows[0]);
                    return { data: rows[0], error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (tabla === 'permiso') {
        return {
          select(_cols) {
            return {
              eq(_campo, valor) {
                return Promise.resolve({
                  data: permisosDB.filter((p) => p.usuario_id === valor),
                  error: null,
                });
              },
            };
          },
          async insert(rows) {
            permisosDB.push(...rows);
            return { data: rows, error: null };
          },
        };
      }
      throw new Error(`Tabla ${tabla} no soportada en test`);
    },
  };

  // 1. Intentar registrar UID existente '01020304' -> debe dar 409
  await assert.rejects(
    async () => {
      await registrarTarjeta(fakeClient, {
        codigoRfid: '01:02:03:04',
        usuarioId: 2,
        areaId: 1,
      });
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /ya está registrado/);
      return true;
    }
  );

  // 2. Registrar UID nuevo 'B5C6D7E8' como Llave Maestra
  const nueva = await registrarTarjeta(fakeClient, {
    codigoRfid: 'b5-c6-d7-e8',
    usuarioId: 3,
    esLlaveMaestra: true,
  });

  assert.equal(nueva.codigo_rfid, 'B5C6D7E8');
  assert.equal(nueva.usuario_id, 3);
  assert.equal(nueva.es_llave_maestra, true);
  assert.equal(nueva.esta_activa, true);
});

test('registrarTarjeta asigna zona física correctamente y actualiza permisos', async () => {
  const tarjetasDB = [];
  const permisosDB = [{ usuario_id: 5, area_id: 1 }];

  const fakeClient = {
    from(tabla) {
      if (tabla === 'tarjeta') {
        return {
          select() {
            return {
              eq(_campo, _valor) {
                return {
                  async maybeSingle() {
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
          insert(rows) {
            return {
              select() {
                return {
                  async single() {
                    tarjetasDB.push(rows[0]);
                    return { data: rows[0], error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (tabla === 'permiso') {
        return {
          select() {
            return {
              eq(campo, valor) {
                return Promise.resolve({
                  data: permisosDB.filter((p) => (p[campo] !== undefined ? p[campo] === valor : p.usuario_id === valor)),
                  error: null,
                });
              },
            };
          },
          async insert(rows) {
            permisosDB.push(...rows);
            return { data: rows, error: null };
          },
        };
      }
      throw new Error(`Tabla ${tabla} no soportada en test`);
    },
  };

  // Registrar tarjeta seleccionando por zona (Área 2 - Datacenter y Área 3 - Laboratorio)
  const tarjeta = await registrarTarjeta(fakeClient, {
    codigoRfid: '99887766',
    usuarioId: 5,
    areaId: 2,
    zonasIds: [2, 3],
  });

  assert.equal(tarjeta.codigo_rfid, '99887766');
  assert.equal(tarjeta.area_id, 2);
  assert.deepEqual(tarjeta.zonas, [2, 3]);

  // Verificar que la tarjeta guardada tiene area_id
  assert.equal(tarjetasDB[0].area_id, 2);

  // Verificar que permisosDB tiene ahora los nuevos permisos insertados (sin duplicar el 1)
  assert.ok(permisosDB.some((p) => p.usuario_id === 5 && p.area_id === 2));
  assert.ok(permisosDB.some((p) => p.usuario_id === 5 && p.area_id === 3));
});

test('registrarTarjeta exige seleccionar zona si no es llave maestra global', async () => {
  const fakeClient = { from() {} };

  await assert.rejects(
    async () => {
      await registrarTarjeta(fakeClient, {
        codigoRfid: '11223344',
        usuarioId: 1,
        esLlaveMaestra: false,
        areaId: null,
        zonasIds: [],
      });
    },
    (err) => {
      assert.equal(err.status, 400);
      assert.match(err.message, /Debe seleccionar al menos una zona/);
      return true;
    }
  );
});

test('buscarUsuarioPorNombre encuentra usuarios por coincidencia exacta, parcial o apellidos compuestos', () => {
  const usuarios = [
    { id: 1, nombre_completo: 'Selwin Rivadineira' },
    { id: 2, nombre_completo: 'Andrés Chávez' },
    { id: 3, nombre_completo: 'Lukas Quiroga' },
    { id: 4, nombre_completo: 'Thomas Mamani' },
    { id: 5, nombre_completo: 'Josermando Cayo' },
  ];

  // Coincidencia exacta insensible a mayúsculas
  const matchExacto = buscarUsuarioPorNombre(usuarios, 'thomas mamani');
  assert.equal(matchExacto?.id, 4);

  // Coincidencia con nombre extendido (caso reportado por usuario: "thomas Mamani Condarco")
  const matchExtendido = buscarUsuarioPorNombre(usuarios, 'thomas Mamani Condarco');
  assert.equal(matchExtendido?.id, 4);

  // Coincidencia por primer nombre o apellido
  const matchPrimerNombre = buscarUsuarioPorNombre(usuarios, 'Lukas');
  assert.equal(matchPrimerNombre?.id, 3);

  const matchApellido = buscarUsuarioPorNombre(usuarios, 'Rivadineira');
  assert.equal(matchApellido?.id, 1);

  // Búsqueda por ID numérico
  const matchId = buscarUsuarioPorNombre(usuarios, '#2');
  assert.equal(matchId?.id, 2);

  // Usuario inexistente devuelve null
  const noExiste = buscarUsuarioPorNombre(usuarios, 'Usuario Inventado Totalmente');
  assert.equal(noExiste, null);

  // Entrada vacía
  assert.equal(buscarUsuarioPorNombre(usuarios, ''), null);
  assert.equal(buscarUsuarioPorNombre([], 'Thomas'), null);
});

test('actualizarTarjeta actualiza tarjeta y sincroniza permisos en tabla permiso', async () => {
  let updatePayloads = [];
  let permisosDB = [{ codigo_rfid: 'A1B2C3D4', usuario_id: 2, area_id: 3 }];
  let eliminados = [];

  const fakeClient = {
    from(tabla) {
      if (tabla === 'tarjeta') {
        return {
          update(payload) {
            updatePayloads.push(payload);
            return {
              eq(_campo, _valor) {
                return {
                  select() {
                    return {
                      async single() {
                        return { data: { codigo_rfid: 'A1B2C3D4', ...payload }, error: null };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (tabla === 'permiso') {
        return {
          select() {
            return {
              eq(campo, valor) {
                return Promise.resolve({
                  data: permisosDB.filter((p) => (p[campo] !== undefined ? p[campo] === valor : p.usuario_id === valor)),
                  error: null,
                });
              },
            };
          },
          async insert(rows) {
            permisosDB.push(...rows);
            return { data: rows, error: null };
          },
          delete() {
            return {
              eq(_campo1, valor1) {
                return {
                  async eq(_campo2, valor2) {
                    eliminados.push({ codigo_rfid: valor1, area_id: valor2 });
                    permisosDB = permisosDB.filter((p) => !(p.codigo_rfid === valor1 && p.area_id === valor2));
                    return { error: null };
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`Tabla ${tabla} no soportada`);
    },
  };

  const resultado = await actualizarTarjeta(fakeClient, 'A1B2C3D4', {
    usuarioId: 2,
    esLlaveMaestra: false,
    estaActiva: true,
    zonasIds: [1, 2], // Queremos zonas 1 y 2 (tenía 3, así que 3 se debe eliminar e insertar 1 y 2)
  });

  assert.equal(resultado.codigo_rfid, 'A1B2C3D4');
  assert.equal(resultado.usuario_id, 2);
  assert.ok(permisosDB.some((p) => p.area_id === 1));
  assert.ok(permisosDB.some((p) => p.area_id === 2));
  assert.ok(eliminados.some((p) => p.area_id === 3));
});

test('registrarTarjeta asigna Norte, Sur, Este y Oeste vinculando codigo_rfid en permiso', async () => {
  const tarjetasDB = [];
  const permisosDB = [];

  const fakeClient = {
    from(tabla) {
      if (tabla === 'tarjeta') {
        return {
          select() {
            return {
              eq(_campo, _valor) {
                return {
                  async maybeSingle() {
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
          insert(rows) {
            return {
              select() {
                return {
                  async single() {
                    tarjetasDB.push(rows[0]);
                    return { data: rows[0], error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (tabla === 'permiso') {
        return {
          select() {
            return {
              eq(campo, valor) {
                return Promise.resolve({
                  data: permisosDB.filter((p) => p[campo] === valor),
                  error: null,
                });
              },
            };
          },
          async insert(rows) {
            permisosDB.push(...rows);
            return { data: rows, error: null };
          },
        };
      }
      throw new Error(`Tabla ${tabla} no soportada`);
    },
  };

  // Registrar tarjeta con zonas 1 (Norte), 2 (Sur), 3 (Este), 4 (Oeste)
  const tarjeta = await registrarTarjeta(fakeClient, {
    codigoRfid: 'DEADBEEF',
    usuarioId: 10,
    zonasIds: [1, 2, 3, 4],
  });

  assert.equal(tarjeta.codigo_rfid, 'DEADBEEF');
  assert.deepEqual(tarjeta.zonas, [1, 2, 3, 4]);

  // Verificar que cada fila en permisosDB tiene codigo_rfid 'DEADBEEF', usuario_id 10, esta_activo true
  assert.equal(permisosDB.length, 4);
  for (const aid of [1, 2, 3, 4]) {
    const perm = permisosDB.find((p) => p.area_id === aid);
    assert.ok(perm, `Debe existir permiso para zona ${aid}`);
    assert.equal(perm.codigo_rfid, 'DEADBEEF');
    assert.equal(perm.usuario_id, 10);
    assert.equal(perm.esta_activo, true);
  }
});
