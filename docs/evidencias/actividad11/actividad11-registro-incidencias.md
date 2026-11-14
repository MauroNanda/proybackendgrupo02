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

**A11 aún no está cerrada.** Los diez casos A11-01–10 ya están cargados en Mantis local (IDs 11–20), con categoría, prioridad, responsable Gabriel Calisaya, nota de procedencia y estado abierto. No se cuentan como cerrados: A11-01/02 dependen de revisión e integración del PR #49; los demás requieren validar el tratamiento documentado y completar el recorrido de seguimiento/resolución con evidencia visual. El nodo Tailscale sigue sin autenticarse, por lo que la instancia local no está compartida con el equipo.

## Controles superados que no se cuentan

El registro previo observó respuestas HTTP 200/401/403, coherencia de KPI en una muestra, cupos/lista de espera y rechazo de asistencia duplicada. En el alcance ensayado se comportaron como se esperaba; son controles funcionales/de seguridad, no incidencias.

## Mantis local: estado comprobado

La instancia local MantisBT 2.28.4 se reconstruyó desde Dockerfile con Apache `mod_rewrite` habilitado. Docker publica Mantis solo en `127.0.0.1:8989`; MariaDB está healthy y sin puerto publicado. `GET /login_page.php` devuelve HTTP 200. La API REST permanece deshabilitada (`/api/rest/` sin autenticación devuelve 401). Los contenedores del resto de Compose se conservaron.

El proyecto `Convoca - mantenimiento` (ID 1) contiene veinte tickets: INC-001–010 (IDs Mantis 1–10, catálogo funcional previo) y A11-01–10 (IDs Mantis 11–20). Los tickets A11 se registraron por el flujo CLI autenticado de Mantis con Gabriel Calisaya como responsable de registro y seguimiento, prioridad, categoría y una nota inicial con evidencia/procedencia y límites. Todos están `Assigned` (50), abiertos; no se simuló cierre. INC-006–010 quedaron a cargo de `juan-carrizo` por el reparto documentado.

La correspondencia A11→Mantis es: A11-01→11, A11-02→12, A11-03→13, A11-04→14, A11-05→15, A11-06→16, A11-07→17, A11-08→18, A11-09→19 y A11-10→20. La consulta de ID/resumen/responsable/categoría/prioridad/estado/notas quedó guardada en [actividad11-mantis-verificacion.txt](actividad11-mantis-verificacion.txt). A4/A5/A6 son evidencia previa y mantienen su atribución original; los tickets A11 no afirman que Gabriel haya ejecutado esos ensayos por primera vez.

**A11 sigue en progreso.** A11-01/02 están corregidos en la rama del PR #49, que espera revisión e integración a `develop`; por eso permanecen abiertos. Los otros ocho tickets también siguen abiertos hasta completar el seguimiento y documentar su resolución conforme a la consigna. No se capturó una nueva pantalla de la lista de tickets. Tailscale continúa en `NeedsLogin`; la aplicación solo escucha en localhost y el equipo no tiene acceso compartido desde esta PC.

## Verificación automatizada

La suite de `test/lab/*.test.js` se ejecutó en Node 22 dentro de un contenedor efímero, con red deshabilitada, `DATABASE_URL` ficticia y fuentes/pruebas montadas como solo lectura. Resultado: **9 pruebas aprobadas, 0 fallidas**. La ejecución directa en Windows no es un resultado válido de la suite porque el `bcrypt` nativo del `node_modules` del host no está disponible; por eso se usó el contenedor con su binding Linux correspondiente.

La salida completa está en `actividad11-tests-node.txt`. Las pruebas controladas de latencia y seguridad están en `actividad11-pruebas-controladas.txt`. Las evidencias de A4, A5 y A6 se enlazan en la tabla; no se ejecutaron cortes adicionales de disponibilidad en A11. No se realizaron pruebas contra producción ni se incluyeron claves, tokens o secretos.

## Cambios de código asociados

- `services/evento.service.js`: admite la descripción opcional indicada por el formulario.
- `middlewares/error-handler.middleware.js`: evita enviar stacks al cliente; conserva el log del error en el servidor.
- `test/lab/event-description.test.js`: regresión de descripción opcional.
- `test/lab/error-handler.test.js`: regresión para evitar exposición de stacks.

## Pendiente para cerrar A11

1. Esperar la revisión de Mauro e integración a `develop` del PR #49 antes de marcar A11-01/02 como resueltos.
2. Completar para A11-03–10 el seguimiento y la resolución con la evidencia enlazada; mantener clara la diferencia entre ensayos previos A4/A5/A6 y pruebas de A11.
3. Capturar la lista y el detalle de tickets desde la interfaz Mantis, con datos sensibles ocultos, y añadir esas capturas al Drive.
4. Si el equipo necesita acceso durante la actividad, volver a autenticar el nodo Tailscale y comprobarlo desde otro dispositivo. Hoy Mantis es solo local.

**Estado de la actividad 11: EN PROGRESO.**
