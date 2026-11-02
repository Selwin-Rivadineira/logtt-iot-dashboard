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
  const tarjetasDB = [{ codigo_rfid: '01020304', usuario_id: 1 }];

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
      throw new Error(`Tabla ${tabla} no soportada en test`);
    },
  };

  // 1. Intentar registrar UID existente '01020304' -> debe dar 409
  await assert.rejects(
    async () => {
      await registrarTarjeta(fakeClient, {
        codigoRfid: '01:02:03:04',
        usuarioId: 2,
      });
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /ya está registrado/);
      return true;
    }
  );

  // 2. Registrar UID nuevo 'B5C6D7E8' -> debe guardarse con éxito
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
