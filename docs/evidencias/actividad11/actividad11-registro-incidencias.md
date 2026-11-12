# Actividad 11 — Incidencias reproducidas y estado

**Fecha:** 12/11/2026
**Responsable de ejecución:** Gabriel Calisaya
**Revisor propuesto:** Mauro Nanda
**Backend:** `MauroNanda/proybackendgrupo02`; PR #49 con base `develop`.
**Laboratorio Convoca:** Compose aislado `convoca-lab-v2-a6test`; API en `127.0.0.1:13000`; PostgreSQL sintético, sin conexión a producción.
**Herramienta de tickets:** Mantis local disponible en `localhost`; el nodo Tailscale está `NeedsLogin`, por lo que el acceso privado compartido aún no se verifica.

## Corrección del registro anterior

El archivo anterior enumeraba doce filas, pero diez eran controles con resultado esperado, A11-11 reutilizaba la prueba de rendimiento de A10 y A11-12 era el único defecto real de Convoca. Las diez comprobaciones se conservan como verificaciones, pero no se cuentan como incidencias. El conteo anterior de doce incidencias queda rectificado.

## Incidencias reproducidas

| ID | Categoría / prioridad | Reproducción y resultado observado | Tratamiento y verificación | Estado |
|---|---|---|---|---|
| A11-01 | Eventos · normal | En el laboratorio, crear un evento sin `descripcion` devolvía HTTP 400 (`Evento.descripcion cannot be null`) aunque el campo es opcional en el contrato del formulario. | `evento.service.js` normaliza el valor ausente a cadena vacía; `test/lab/event-description.test.js` verifica la regresión. Suite aislada 9/9. PR #49 abierto hacia `develop`; falta revisión e integración para considerarlo cerrado. | Corregido en rama; pendiente de aprobación/merge |
| A11-02 | Seguridad · alta condicional | Simulación local: `GET /api/dashboard/kpis` sin token devolvió HTTP 401, pero en `NODE_ENV=development` la respuesta incluía el stack de Express y rutas internas. No se accedió a datos. | Se eliminó `stack` de los cuerpos JSON en el middleware de errores; el error completo se conserva en logs del servidor. La prueba de regresión falló antes del cambio y pasó después; la suite aislada terminó 9/9. No se probó producción. | Corregido en rama; pendiente de aprobación/merge |
| A11-03 | Rendimiento · normal, simulación controlada | En PostgreSQL aislado se mantuvo un bloqueo `ACCESS EXCLUSIVE` sobre `Eventos` durante 25 s. `GET /api/eventos` respondió HTTP 200 en 8.687 ms. Tras liberar la transacción, la misma consulta respondió HTTP 200 en 193 ms. | Se liberó el bloqueo con `COMMIT`; la latencia volvió a la línea base observada. No se atribuye el retraso a un defecto espontáneo de Convoca ni a producción. | Simulación resuelta y medida |

**Conteo verificado hasta ahora: 3 incidencias reproducibles (1 defecto de aplicación y 2 simulaciones controladas).** A11 sigue incompleta: faltan siete incidencias reproducibles con seguimiento y verificación de tratamiento, incluyendo los casos que se carguen y resuelvan en Mantis. No se inventan defectos para completar el mínimo.

## Controles superados que no se cuentan

El registro previo observó respuestas HTTP 200/401/403, coherencia de KPI en una muestra, cupos/lista de espera y rechazo de asistencia duplicada. En el alcance ensayado se comportaron como se esperaba; son controles funcionales/de seguridad, no incidencias.

## Mantis: estado comprobado

El Compose de Mantis se levantó localmente. Se restauró `mantis-precompartir-20261018-120121.sql` únicamente después de comprobar que la base objetivo estaba vacía. El respaldo contiene cinco tickets históricos (INC-001–INC-005 / IDs 1–5), no diez. La interfaz de login respondió HTTP 200 en `http://127.0.0.1:8989/login_page.php`. La URL compartida no se declara disponible: el nodo Tailscale informa `NeedsLogin` y requiere autenticación interactiva.

## Verificación automatizada

La suite de `test/lab/*.test.js` se ejecutó en Node 22 dentro de un contenedor efímero, con red deshabilitada, `DATABASE_URL` ficticia y fuentes/pruebas montadas como solo lectura. Resultado: **9 pruebas aprobadas, 0 fallidas**. La ejecución directa en Windows no es un resultado válido de la suite porque el `bcrypt` nativo del `node_modules` del host no está disponible; por eso se usó el contenedor con su binding Linux correspondiente.

La salida completa está en `actividad11-tests-node.txt`. La prueba controlada de latencia y el estado de Mantis/Tailscale se registran en este documento. No se realizaron pruebas contra producción ni se incluyeron claves, tokens o secretos.

## Cambios de código asociados

- `services/evento.service.js`: admite la descripción opcional indicada por el formulario.
- `middlewares/error-handler.middleware.js`: evita enviar stacks al cliente; conserva el log del error en el servidor.
- `test/lab/event-description.test.js`: regresión de descripción opcional.
- `test/lab/error-handler.test.js`: regresión para evitar exposición de stacks.

## Pendiente para cerrar A11

1. Cargar y resolver al menos siete incidencias adicionales reproducibles en Mantis, con categoría, prioridad, responsable, seguimiento y evidencia antes/después; incluir rendimiento y seguridad.
2. Completar la autenticación interactiva de Tailscale y verificar la URL compartida desde otro dispositivo/red.
3. Adjuntar capturas reales de Mantis y la evolución de los tickets; revisar las transiciones antes de cerrar cada caso.
4. Mantener el PR #49 con base `develop`; esperar revisión de Mauro antes de integrar. El PR por sí solo no cierra A11.

**Estado de la actividad 11: EN PROGRESO.**
