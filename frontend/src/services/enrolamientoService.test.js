import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarUID,
  validarFormatoUID,
  registrarTarjeta,
} from './enrolamientoService.js';

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
