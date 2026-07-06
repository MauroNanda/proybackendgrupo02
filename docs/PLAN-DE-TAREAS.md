# Plan de Tareas — Convoca (Grupo G02)

Estado de las tareas del proyecto. Todas las tareas planificadas están terminadas.

## Fase 1 — Base del sistema

| Tarea | Descripción | Responsable | Estado |
|---|---|---|---|
| T-00 | Proyecto base: backend Express + Sequelize (PostgreSQL en Neon) y frontend Angular con layouts público y administrativo. | Equipo | Hecha |
| T-01 | Autenticación y seguridad: registro, inicio de sesión, JWT, roles y protección de rutas. | Equipo | Hecha |
| T-02 | Eventos y categorías: administración de eventos, catálogo público con filtros y detalle. | Equipo | Hecha |
| T-03 | Inscripciones y check-in: inscripción con control de cupo, cancelación y registro de asistencia. | Equipo | Hecha |
| T-04 | Notificaciones: avisos al usuario ante movimientos de su inscripción. | Equipo | Hecha |
| T-05 / T-10 | Dashboard administrativo con indicadores (KPIs) y gráficos. | Equipo | Hecha |

## Fase 3 — Integraciones externas

| Tarea | Descripción | Responsable | Estado |
|---|---|---|---|
| T-11 | Login con Google (OAuth) y verificación en dos pasos (2FA) por email. | Fio | Hecha |
| T-12 | Bot de Telegram: difunde eventos publicados y cancelaciones en un canal. | Mauro | Hecha |
| T-13 | Notificaciones web push (navegador) y aplicación instalable (PWA). | Gabriel Calisaya | Hecha |
| T-14 | Bot de Discord: difunde eventos publicados en un canal. | Seba Velázquez | Hecha |
| T-15 | Botón "Agregar a Google Calendar" en el detalle del evento. | Delia | Hecha |

## Mejoras adicionales aplicadas

*   Notificaciones personales por tres canales (en la app, email y push): al confirmar una inscripción, quedar en lista de espera, liberarse un cupo, cancelarse un evento donde el usuario está inscripto, o cambiar su fecha o lugar.
*   Recordatorio automático 24 horas antes del evento a los inscriptos confirmados.
*   Reglas de negocio: no permite inscribirse a eventos cancelados o ya realizados; el catálogo público muestra solo eventos publicados.
*   Seguridad: la sesión usa una cookie protegida (el token no queda expuesto a scripts del navegador); el registro siempre crea usuarios con rol Asistente; control de intentos en la verificación 2FA; manejo uniforme de errores.
