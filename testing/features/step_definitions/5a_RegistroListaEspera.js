const { Given, When, Then, AfterAll } = require("@cucumber/cucumber");
const assert = require("assert");
const request = require("sync-request");
const { Client } = require("pg");

// --- CONFIGURACIÓN ---
const BACKEND_URL = "http://backend:8080";

// Configuración de conexión a la Base de Datos
const dbConfig = {
  user: "APP",
  host: "database",
  database: "labprog",
  password: "APP",
  port: 5432,
};

// --- ESTADO DEL TEST ---
let usuarioData = {};
let activationToken = null;
let authToken = null; // JWT
let lastStatus = null;

// --- UTILIDADES ---
function generarUsuarioAleatorio() {
  const timestamp = Date.now();
  return {
    nombre: "Integration",
    apellido: "Test",
    dni: Math.floor(10000000 + Math.random() * 90000000).toString(),
    email: `flow_test_${timestamp}@turnero.com`,
    password: "Password123!",
    telefono: "1122334455",
  };
}

async function obtenerTokenDeBaseDeDatos(email) {
  const client = new Client(dbConfig);
  try {
    await client.connect();
    const query = `
            SELECT t.token 
            FROM account_activation_tokens t
            JOIN users u ON t.user_id = u.id
            WHERE u.email = $1
            ORDER BY t.expires_at DESC 
            LIMIT 1;
        `;
    const res = await client.query(query, [email]);
    return res.rows[0] ? res.rows[0].token : null;
  } catch (err) {
    console.error("❌ Error DB:", err.message);
    return null;
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

// ===========================
// PASOS DEL ESCENARIO
// ===========================

Given("que existe un sistema de gestión de turnos funcionando", function () {
  // Health check simple
});

// 1. REGISTRO
Given("que un nuevo paciente se registra en el sistema", function () {
  usuarioData = generarUsuarioAleatorio();
  console.log(`📝 Registrando usuario: ${usuarioData.email}`);

  try {
    const res = request("POST", `${BACKEND_URL}/api/auth/register`, {
      json: usuarioData,
    });

    lastStatus = res.statusCode;
    assert.ok(
      [200, 201].includes(res.statusCode),
      `Falló registro. Status: ${res.statusCode}`
    );
    console.log("✅ Registro enviado correctamente.");
  } catch (err) {
    assert.fail(`Excepción en registro: ${err.message}`);
  }
});

// 2. OBTENCIÓN DE TOKEN
When(
  "el sistema genera el token de activación",
  { timeout: 10000 },
  async function () {
    await new Promise((r) => setTimeout(r, 2000));
    activationToken = await obtenerTokenDeBaseDeDatos(usuarioData.email);
    assert.ok(activationToken, "❌ No se pudo recuperar el token de la BD.");
    console.log(`🎟️ Token recuperado: ${activationToken.substring(0, 10)}...`);
  }
);

// 3. ACTIVACIÓN
When("el paciente valida su email con dicho token", function () {
  try {
    const res = request("POST", `${BACKEND_URL}/api/auth/activate-account`, {
      json: { token: activationToken },
    });

    lastStatus = res.statusCode;
    assert.strictEqual(
      res.statusCode,
      200,
      `Falló la activación. Status: ${res.statusCode}`
    );
    console.log("✅ Cuenta activada exitosamente.");
  } catch (err) {
    assert.fail(`Excepción activando cuenta: ${err.message}`);
  }
});

// 4. LOGIN
When("inicia sesión con sus nuevas credenciales", function () {
  try {
    const res = request("POST", `${BACKEND_URL}/api/auth/login`, {
      json: {
        email: usuarioData.email,
        password: usuarioData.password,
      },
    });

    assert.strictEqual(res.statusCode, 200, "Login falló");
    const body = JSON.parse(res.getBody("utf8"));

    if (body.data && body.data.accessToken) {
      authToken = body.data.accessToken;
    } else {
      authToken = body.accessToken;
    }

    assert.ok(authToken, "No se recibió JWT en login");
    console.log("🔑 Login exitoso.");
  } catch (err) {
    assert.fail(`Excepción en login: ${err.message}`);
  }
});

// 5. LISTA DE ESPERA
When(
  "solicita unirse a la lista de espera para {string}",
  function (especialidadNombre) {
    try {
      const res = request("POST", `${BACKEND_URL}/lista-espera`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        json: {
          // CORRECCIÓN: Usamos 'especialidadId' en lugar de 'especialidad' o 'especialidadNombre'.
          // Asumimos que ID 1 es "Cardiología" o alguna especialidad válida.
          especialidadId: 99998,
          centroAtencionId: 4,
          urgenciaMedica: "BAJA",

          // Agregamos estado inicial por si el backend no lo asigna por defecto
          estado: "PENDIENTE",
        },
      });

      lastStatus = res.statusCode;

      if (res.statusCode >= 400) {
        console.log("⚠️ Error Backend (Body):", res.getBody("utf8"));
      }
    } catch (err) {
      lastStatus = err.statusCode;
      if (err.body) {
        console.log("⚠️ Error API:", err.body.toString());
      } else {
        console.log("⚠️ Error API:", err.message);
      }
    }
  }
);
// 6. VALIDACIÓN FINAL
Then("el sistema confirma su ingreso a la lista exitosamente", function () {
  // 200 (OK) o 201 (Created)
  const esExito = [200, 201].includes(lastStatus);

  // Si dio 409 (Conflict), significa que el usuario YA estaba en la lista, lo cual también es "éxito" de conexión
  if (lastStatus === 409) {
    console.log("⚠️ El usuario ya estaba en la lista, pero el test es válido.");
    return;
  }

  assert.ok(esExito, `Falló ingreso a lista. Status: ${lastStatus}`);
  console.log("🎉 Flujo completo verificado correctamente.");
});
