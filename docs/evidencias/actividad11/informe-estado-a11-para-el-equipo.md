# Informe de estado de la Actividad 11 — Convoca

**Fecha:** 14/11/2026  
**Responsable del seguimiento:** Gabriel Calisaya  
**Revisor del PR:** Mauro Nanda  
**Estado:** EN PROGRESO. Este informe deja constancia de lo completado y de lo que falta; no declara cerrada A11.

## Avances realizados

- Se descartó Oracle y se volvió a la instalación local de MantisBT con Docker Compose. Mantis responde HTTP 200 en `/login_page.php`; MariaDB está saludable y no publica su puerto.
- El proyecto **Convoca - mantenimiento** tiene 20 tickets. Los casos A11-01–10 son Mantis #11–20, asignados a Gabriel, con categoría, prioridad y notas de seguimiento. Los diez están `Resolved` (80); ninguno está `Closed`.
- A11-01/02 tienen correcciones y pruebas de regresión en el [PR #49](https://github.com/MauroNanda/proybackendgrupo02/pull/49), abierto hacia `develop`, con Mauro solicitado como revisor. La suite de laboratorio documentada pasó 9/9; el PR aún espera revisión e integración.
- Se autenticó el nodo `hia-mantis-convoca` en la tailnet de Gabriel y se configuró Tailscale Serve privado por HTTP. URL: http://hia-mantis-convoca.tailcc7820.ts.net:8080. No se habilitó Funnel ni publicación en Internet.
- Se guardó una captura real de la pantalla de inicio de sesión de Mantis. No es una captura del listado ni del detalle de incidencias.

## Pendientes para completar A11

1. **Confirmar que los diez casos cumplen el alcance de la consigna.** La evidencia actual contiene dos correcciones de producto/seguridad (#11–12), una simulación de rendimiento (#13), ensayos reutilizados de A4/A6 (#14–18) y mediciones/mejoras de laboratorio A5 (#19–20). Por eso no demuestra por sí sola diez incidencias nuevas e independientes del producto. Mauro debe confirmar si estos casos reproducibles y sus fuentes anteriores alcanzan el criterio; si no, habrá que registrar y tratar casos adicionales con evidencia propia.
2. **Revisión e integración del PR #49.** A11-01/02 figuran como resueltos en Mantis, pero el código aún debe ser revisado por Mauro e integrado en `develop` antes de dar esas correcciones por integradas.
3. **Evidencia visual del flujo de Mantis.** Faltan capturas del listado y detalle de tickets con estados, responsables, prioridades, notas, resolución y seguimiento. La captura existente solo prueba que la página de login carga.
4. **Acceso del equipo.** Serve es privado a la tailnet, pero la consola registra solo un dispositivo: `hia-mantis-convoca`. Hay que incorporar a los compañeros y probar la URL desde al menos otra PC. El equipo anfitrión debe permanecer encendido con Docker activo.
5. **Validación de cierre en Mantis.** Después de confirmar la resolución y el PR, actualizar los estados de los tickets que corresponda; hoy los diez están `Resolved`, no `Closed`.

## Evidencias

- [Registro de incidencias A11 en Drive](https://drive.google.com/file/d/1-iSN07U6lciqncEkSyDm1rZKw0trRaRM/view)
- [Estado e IDs verificados en Mantis](https://drive.google.com/file/d/1SBMHGqYOhSGz6PdwC6gbdbToMq_VLPVw/view)
- [Verificación de Tailscale Serve](https://drive.google.com/file/d/1Bsl8toTdQMxjN_cX5cp0ENcJuOw78itY/view)
- [Captura de la pantalla de login](https://drive.google.com/file/d/10DSNJuRXI-HGfktaKpcGKx5USmQqy5bD/view)
- [Pruebas controladas y fuentes A4/A5/A6](https://drive.google.com/file/d/1HGSn6WC2LlZVqDhKS5qL3BWucXohc0It/view)
- [PR #49 hacia `develop`](https://github.com/MauroNanda/proybackendgrupo02/pull/49)

**Mensaje para el equipo:** pueden revisar desde ahora el PR #49 y la documentación en Drive. A11 todavía no está lista para marcarse como cerrada; quedan los puntos anteriores, especialmente validar el alcance de los diez casos, integrar las correcciones y comprobar acceso/evidencia de Mantis.