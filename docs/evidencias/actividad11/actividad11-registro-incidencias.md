# Actividad 11 — Registro de incidencias y verificaciones

**Proyecto:** Convoca G02
**Responsable de ejecución:** Gabriel Calisaya
**Revisor propuesto:** Mauro Nanda
**Fecha de consolidación:** 2026-11-12
**Repositorio/base:** `MauroNanda/proybackendgrupo02`, rama local `chore/gestion-incidencias`, derivada de `develop` actualizado (`b7e2ba7`).
**Entorno:** Docker Compose de prueba aislado `convoca-lab-v2-a6test`; API solo en `127.0.0.1:13000`; PostgreSQL aislado en puerto 55435 y réplica en 55436. Sin conexión a producción. Datos sintéticos. Después de las pruebas se verificó `Eventos=0`, `Inscripciones=0`, `Usuarios=6`.

## Alcance y herramienta de registro

No hay un servicio Mantis/GLPI disponible en el laboratorio actual. De acuerdo con la consigna de A11, se conserva el registro en Drive hasta que la herramienta esté disponible. Este documento no inventa números de tickets ni presenta los registros de Drive como tickets GLPI/Mantis. Para resultados correctos, se registran como controles superados; solo se etiqueta como defecto el comportamiento reproducido y corregido.

Cada registro incluye reproducción/resumen, resultado, tratamiento y verificación posterior. Los registros A11-01 a A11-10 cubren controles funcionales y de seguridad verificados en el entorno aislado. A11-11 reutiliza la comprobación de consulta lenta ya realizada y documentada en A10. A11-12 registra un defecto real hallado en el contrato de descripción opcional y su corrección.

## Registros

| ID | Categoría y reproducción | Resultado observado y evidencia | Tratamiento / verificación | Estado |
|---|---|---|---|---|
| A11-01 | Disponibilidad: consultar `GET /api/health` con PostgreSQL levantado. | HTTP 200; `status=ok`, `database=up`. API y DB aisladas saludables. | Control esperado. Se repitió tras reconstruir la API con el cambio de A11. | Superado |
| A11-02 | Seguridad/autenticación: `GET /api/dashboard/kpis` sin token. | HTTP 401. | Acceso sin sesión rechazado como corresponde; no se corrigió porque no era defecto. | Superado |
| A11-03 | Seguridad/autorización: solicitar KPIs con usuario autenticado de rol `ASISTENTE`. | HTTP 403. | La ruta administrativa exige rol organizador. Resultado esperado; sin cambio. | Superado |
| A11-04 | Control de autorización positiva: solicitar KPIs con usuario de rol `ORGANIZADOR`. | HTTP 200. | Se comprobó que el control de rol no bloquea al rol permitido. | Superado |
| A11-05 | Integridad de métricas: comparar KPIs con conteos de la DB sembrada con 6 usuarios, 2 eventos publicados y 2 inscripciones activas. | API: `totalUsuarios=6`, `totalEventos=2`, `totalInscripciones=2`; coincide con los conteos directos. | No se detectó inconsistencia en esta muestra controlada. | Superado |
| A11-06 | Cupos/lista de espera: inscribir dos usuarios en evento de un cupo. | Primera inscripción `CONFIRMADO`; segunda `ESPERA`. | El límite de cupo se respetó. | Superado |
| A11-07 | Promoción de lista: cancelar la inscripción confirmada del caso anterior. | Cancelación HTTP 200; la inscripción en espera pasó a `CONFIRMADO`. | Se verificó el estado posterior de la inscripción promovida. | Superado |
| A11-08 | Asistencia por QR: validar el QR de una inscripción confirmada por primera vez. | HTTP 200; estado cambió a `ASISTIO`. | Primera marcación registrada correctamente. | Superado |
| A11-09 | Duplicación de asistencia por QR: volver a validar el mismo QR. | HTTP 400; mensaje de asistencia ya registrada. | Se evitó contabilizar dos veces la asistencia. | Superado |
| A11-10 | Asistencia manual duplicada: registrar manualmente la misma inscripción dos veces. | Primera marcación HTTP 200; repetición HTTP 400. | Se evitó la doble marcación. | Superado |
| A11-11 | Rendimiento: ejecutar la consulta controlada con `pg_sleep(30)` y observar el monitor de consultas activas. | A10 registró la consulta como activa/lenta durante la demora controlada. La métrica representa consultas en curso, no historial SQL. | Incidencia inducida y controlada para comprobar visibilidad; terminó al finalizar la consulta. Referencia: evidencia y sección A10 del informe. | Verificada en A10 |
| A11-12 | Defecto de datos: crear evento omitiendo `descripcion`, que el frontend presenta como opcional. | Antes: HTTP 400, `Evento.descripcion cannot be null`. La ruta aceptaba ausencia pero el modelo la persistía como NOT NULL. | Se añadió `datosEvento.descripcion = datosEvento.descripcion ?? ''` y una prueba de regresión. Tras reconstruir la API, la creación respondió HTTP 201 con descripción vacía; se borró el evento de prueba. | Corregido y verificado |

## Verificación automatizada posterior

Se ejecutó el conjunto de pruebas de laboratorio Node en un contenedor efímero, con red deshabilitada, variables ficticias y la carpeta `test` montada como solo lectura. Resultado: **8 pruebas, 8 aprobadas, 0 fallidas**. Incluye políticas de TLS, credenciales de demostración, distribución de datos, regresión de descripción opcional y healthcheck con DB disponible/caída. El comando y salida completa están en `actividad11-tests-node.txt`.

La DB de pruebas aislada quedó sin eventos ni inscripciones temporales. No se ejecutó ninguna prueba contra producción ni se incluyeron contraseñas, tokens o secretos en este registro.

## Cambios de código asociados

- `services/evento.service.js`: normaliza la descripción omitida a cadena vacía, consistente con el formulario frontend y el modelo.
- `test/lab/event-description.test.js`: prueba de regresión para descripción opcional.

La corrección se preparó en la rama `chore/gestion-incidencias` a partir de `develop`. El flujo de integración acordado exige que el PR use base `develop` y solicite a Mauro Nanda como revisor.

## Límites

Las verificaciones de seguridad y negocio de esta tabla son sobre una base sintética aislada, no constituyen una auditoría de seguridad. A11-11 depende del ensayo de rendimiento documentado en A10 y se cita como evidencia reutilizada, no como una nueva ejecución. Mantis/GLPI no estaba instalado, por eso este es un registro de contingencia en Drive conforme a la guía.
