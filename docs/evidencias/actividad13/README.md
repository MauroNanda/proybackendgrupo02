# A13 — Validación integrada

Pruebas ejecutadas el 17/11/2026 sobre la rama de validación, usando n8n 2.44.7 en Docker, Prometheus A10, Mantis A11, el procedimiento A4 y Nextcloud A12. No se repitió la carga masiva.

| Caso | Evidencia real | Resultado |
|---|---|---|
| Caída del exportador PostgreSQL | Incidencia Mantis 12, ejecución 20; captura de Mantis | Creación desde `ConvocaExportadorCaido`, aviso y deduplicación durante la falla. |
| Recuperación del exportador | Ejecución 45; `recuperacion.json` | Se resolvió la misma incidencia y se recibió el aviso. El flujo procesa alertas y recuperaciones simultáneas. |
| Mantis detenido | Ejecución 46; `fallo-mantis.json` | Entrada de ensayo identificada como tal; fallo de conexión manejado y aviso recibido. No se presenta como una alerta real de Prometheus. |
| Backup y restauración | Ejecuciones identificadas en `validacion.json`, captura del nodo de restauración | Misma copia piloto verificada por SHA-256 y restaurada en base temporal. Fuente conservada; temporal eliminada por A4. |
| Aprobación y autenticación | `validacion.json` y pruebas del runner | Sin credencial: 403; sin aprobación: restauración rechazada. Perfil completo y operaciones arbitrarias rechazados. |
| Métricas y publicación | `validacion.json`, captura de Nextcloud | Python usó datos actuales y Nextcloud respondió 201. Aviso recibido. |
| Datos incompletos y almacenamiento | `validacion.json` | Incompletitud inyectada explícitamente; carpeta inexistente respondió 404. Ambos errores se manejaron y avisaron. |
| SMTP detenido | Ejecución 48; `fallo-smtp.json` | Tres intentos; resultado `aviso_pendiente` guardado en la ejecución. No se afirmó una entrega inexistente. |
| Reinicio | `persistencia.json` | Estado de incidencias conservado, login correcto e informe publicado tras reiniciar; credenciales cifradas reutilizables. |
| Alta nueva | `alta-limpia.json` | Propietario y login HTTP 200 en contenedor desechable nuevo, retirado al terminar. No equivale a recrear todo A4–A12. |
| Aislamiento Mantis | `persistencia.json` | REST externa 403; administración externa 403; REST desde n8n sin token 401. |

**Canal:** Mailpit local, aceptado para la demostración. Su recepción SMTP no acredita correo externo ni lectura del mensaje por el grupo.

Las PNG son capturas directas de Chrome con Playwright sobre las interfaces reales; no son imágenes generadas ni resultados dibujados. Se cerró el campo de encabezados antes de capturar el nodo de restauración. La clave de entrada se renovó antes de compartir las evidencias.

Las JSON son resúmenes de ejecuciones reales, sin cookies, claves ni exportaciones completas de n8n. Las definiciones de flujos están en `infra/n8n/flujos`. Los dumps y manifiestos completos permanecen en el laboratorio privado de A4.

Validación de código: **15/15** pruebas de `node --test test/lab/*.test.js`; ESLint **0 errores**, dos advertencias anteriores en una migración. El instructivo de reproducción es `docs/AUTOMATIZACIONES_A13.md`.
