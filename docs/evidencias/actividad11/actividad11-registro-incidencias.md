# Actividad 11 — Incidencias reproducidas y estado

**Fecha:** 12/11/2026
**Responsable de registro y seguimiento A11:** Gabriel Calisaya
**Revisor propuesto:** Mauro Nanda
**Backend:** `MauroNanda/proybackendgrupo02`; PR #49 con base `develop`.
**Laboratorio Convoca:** Compose aislado `convoca-lab-v2-a6test`; API en `127.0.0.1:13000`; PostgreSQL sintético, sin conexión a producción.
**Herramienta de tickets:** Mantis local disponible en `localhost`; el nodo Tailscale está `NeedsLogin`, por lo que el acceso privado compartido aún no se verifica.

## Corrección del registro anterior

El archivo anterior enumeraba doce filas, pero diez eran controles con resultado esperado, A11-11 reutilizaba la prueba de rendimiento de A10 y A11-12 era el único defecto real de Convoca. Las diez comprobaciones se conservan como verificaciones, pero no se cuentan como incidencias. El conteo anterior de doce incidencias queda rectificado.

## Casos reproducibles e incidencias registradas

| ID | Categoría / prioridad | Reproducción y resultado observado | Tratamiento y verificación | Estado |
|---|---|---|---|---|
| A11-01 | Eventos · normal | En el laboratorio, crear un evento sin `descripcion` devolvía HTTP 400 (`Evento.descripcion cannot be null`) aunque el campo es opcional en el contrato del formulario. | `evento.service.js` normaliza el valor ausente a cadena vacía; `test/lab/event-description.test.js` verifica la regresión. Suite aislada 9/9. PR #49 abierto hacia `develop`; falta revisión e integración para considerarlo cerrado. | Corregido en rama; pendiente de aprobación/merge |
| A11-02 | Seguridad · alta condicional | Simulación local: `GET /api/dashboard/kpis` sin token devolvió HTTP 401, pero en `NODE_ENV=development` la respuesta incluía el stack de Express y rutas internas. No se accedió a datos. | Se eliminó `stack` de los cuerpos JSON en el middleware de errores; el error completo se conserva en logs del servidor. La prueba de regresión falló antes del cambio y pasó después; la suite aislada terminó 9/9. No se probó producción. | Corregido en rama; pendiente de aprobación/merge |
| A11-03 | Rendimiento · normal, simulación controlada | En PostgreSQL aislado se mantuvo un bloqueo `ACCESS EXCLUSIVE` sobre `Eventos` durante 25 s. `GET /api/eventos` respondió HTTP 200 en 8.687 ms. Tras liberar la transacción, la misma consulta respondió HTTP 200 en 193 ms. | Se liberó el bloqueo con `COMMIT`; la latencia volvió a la línea base observada. No se atribuye el retraso a un defecto espontáneo de Convoca ni a producción. | Simulación resuelta y medida |
| A11-04 | Integridad de carga · alta, ensayo heredado A4 | El ensayo de A4 incluyó datos ajenos al lote piloto y registró el rechazo sin mezclar filas. | La validación impidió confirmar el lote incompatible; el conjunto piloto quedó separado. El JSON de A4 enumera el ensayo y su ejecución global `OK`, sin salida individual por caso. | Resuelto en ensayo A4; responsable de seguimiento A11: Gabriel |
| A11-05 | Disponibilidad de carga · media, ensayo heredado A4 | El ensayo de A4 inició una carga y probó el rechazo de otra carga simultánea. | La segunda carga fue rechazada; se mantuvo la protección de exclusión de cargas. La evidencia disponible nombra la prueba, pero no conserva su log individual. | Resuelto en ensayo A4; responsable de seguimiento A11: Gabriel |
| A11-06 | Continuidad de carga · media, interrupción reproducida A4 | A4 documenta una interrupción real de sesión después de confirmar un lote; el perfil de piloto registra reanudación de lotes faltantes y finalización. | Se retomó desde el avance confirmado sin mezclar filas. La evidencia resumida reporta `OK`; no se presenta como captura del instante de corte. | Recuperado en ensayo A4; responsable de seguimiento A11: Gabriel |
| A11-07 | Compatibilidad de datos · alta, ensayo heredado A4 | El ensayo de A4 incluyó el rechazo de una versión incompatible y la repetición de una carga completa sin duplicación. | Se rechazó la versión incompatible y se verificó que la repetición no duplicara datos. El JSON enumera ambas pruebas bajo un único resultado global `OK`; se registra aquí solo el caso de incompatibilidad. | Resuelto en ensayo A4; responsable de seguimiento A11: Gabriel |
| A11-08 | Continuidad de réplica · alta, corte reproducido A6 | Se detuvo solo `db-replica`: `pg_stat_replication` informó cero standbys mientras la API siguió HTTP 200 contra el principal. Tras reiniciar, ambos registros de prueba aparecieron en réplica y volvió `streaming`. | Se reinició el standby persistente; LSN quedó igualado y la limpieza de filas temporales se propagó. No hubo failover automático ni cambio de filas del piloto. | Recuperado en ensayo A6; responsable de ejecución original y seguimiento: Gabriel |
| A11-09 | Rendimiento · media, medición A5 | El catálogo medido sobre el dataset de 100.000 usuarios, 10.000 eventos y 6.000.000 inscripciones tardó 5.330,062 ms antes de la optimización. | En el ensayo A5, `separate: true` redujo el tiempo medido a 3.176,417 ms con 725 eventos y 431.000 inscripciones equivalentes. Es evidencia de laboratorio, no una medición HTTP ni garantía de producción. | Mejora demostrada en ensayo A5; integración productiva no se afirma aquí |
| A11-10 | Rendimiento · media, medición A5 | La agregación mensual de inscripciones tardó 276,302 ms antes de la optimización en el dataset completo. | El ensayo A5 midió 154,735 ms después de usar `COUNT(*)` e índice de fecha, conservando siete meses y sus totales. Es una mejora de laboratorio, no prueba de carga HTTP. | Mejora demostrada en ensayo A5; integración productiva no se afirma aquí |

**Conteo documental: 10 casos reproducibles con evidencia previa o de A11 (2 defectos/correcciones de aplicación y seguridad, 1 simulación controlada de rendimiento en A11, 4 ensayos de integridad/continuidad de A4, 1 corte de réplica de A6 y 2 hallazgos de rendimiento medidos en A5).** Los casos A4/A5/A6 se reutilizan con atribución explícita: no se afirma que Gabriel ejecutó originalmente las actividades asignadas a otra persona. Los dos casos A5 son hallazgos medidos y optimizados en laboratorio; la integración productiva no se da por hecha.

**Fuentes enlazadas:** A4 [JSON de reanudación y ensayos](https://drive.google.com/file/d/1YeBTRC1Nn6781k_TPdcSAtLB-FrUUHtP/view) y [README de evidencias](https://drive.google.com/file/d/1eijeESFGBi5RS71SikBryXZ7aybuiH-A/view); A5 [resultados de ocho consultas](https://docs.google.com/document/d/1jPQREhVNm1DDiVr3olxqZM8qjWb4M7RLZgHVlikqWrg/edit); A6 [salida de corte y recuperación de réplica](https://drive.google.com/file/d/1h1qWxsSofjCCNY0wyCxTQ6iQ8a46unNj/view); A11 [pruebas controladas](https://drive.google.com/file/d/1HGSn6WC2LlZVqDhKS5qL3BWucXohc0It/view).

**A11 aún no está cerrada.** El mínimo documental queda respaldado, pero faltan cargar y seguir los diez casos en Mantis compartido, adjuntar las capturas del ciclo de tickets y completar autenticación de Tailscale. La base local solo contiene cinco tickets históricos y no se presenta como los diez tickets requeridos.

## Controles superados que no se cuentan

El registro previo observó respuestas HTTP 200/401/403, coherencia de KPI en una muestra, cupos/lista de espera y rechazo de asistencia duplicada. En el alcance ensayado se comportaron como se esperaba; son controles funcionales/de seguridad, no incidencias.

## Mantis: estado comprobado

El Compose de Mantis se levantó localmente. Se restauró `mantis-precompartir-20261018-120121.sql` únicamente después de comprobar que la base objetivo estaba vacía. El respaldo contiene cinco tickets históricos (INC-001–INC-005 / IDs 1–5), no diez. La interfaz de login respondió HTTP 200 en `http://127.0.0.1:8989/login_page.php`. La URL compartida no se declara disponible: el nodo Tailscale informa `NeedsLogin` y requiere autenticación interactiva.

## Verificación automatizada

La suite de `test/lab/*.test.js` se ejecutó en Node 22 dentro de un contenedor efímero, con red deshabilitada, `DATABASE_URL` ficticia y fuentes/pruebas montadas como solo lectura. Resultado: **9 pruebas aprobadas, 0 fallidas**. La ejecución directa en Windows no es un resultado válido de la suite porque el `bcrypt` nativo del `node_modules` del host no está disponible; por eso se usó el contenedor con su binding Linux correspondiente.

La salida completa está en `actividad11-tests-node.txt`. Las pruebas controladas de latencia y seguridad están en `actividad11-pruebas-controladas.txt`. Las evidencias de A4, A5 y A6 se enlazan en la tabla; no se ejecutaron cortes adicionales de disponibilidad en A11. No se realizaron pruebas contra producción ni se incluyeron claves, tokens o secretos.

## Cambios de código asociados

- `services/evento.service.js`: admite la descripción opcional indicada por el formulario.
- `middlewares/error-handler.middleware.js`: evita enviar stacks al cliente; conserva el log del error en el servidor.
- `test/lab/event-description.test.js`: regresión de descripción opcional.
- `test/lab/error-handler.test.js`: regresión para evitar exposición de stacks.

## Pendiente para cerrar A11

1. Cargar y seguir los diez casos en Mantis compartido, con categoría, prioridad, responsable, historial y evidencia antes/después; incluir rendimiento y seguridad.
2. Completar la autenticación interactiva de Tailscale y verificar la URL compartida desde otro dispositivo/red.
3. Adjuntar capturas reales de Mantis y la evolución de los tickets; revisar las transiciones antes de cerrar cada caso.
4. Mantener el PR #49 con base `develop`; esperar revisión de Mauro antes de integrar. El PR por sí solo no cierra A11.

**Estado de la actividad 11: EN PROGRESO.**
