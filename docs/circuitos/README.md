# Circuitos del sistema — Guías de defensa

Cada archivo de esta carpeta explica un circuito del sistema para poder defenderlo: qué hace, el flujo paso a paso, los archivos que intervienen (backend y frontend) y los puntos clave que conviene tener claros, con los bloques de código más importantes comentados.

## Mapa de circuitos y responsables

| Circuito | Responsable | Guía |
|---|---|---|
| Autenticación (registro, login, Google, 2FA, sesión y roles) | Fio (Google + 2FA) / equipo (base) | [autenticacion.md](./autenticacion.md) |
| Eventos e inscripciones (catálogo, cupo, lista de espera, check-in) | Equipo | [eventos-e-inscripciones.md](./eventos-e-inscripciones.md) |
| Notificaciones (app, email y push; recordatorio 24 h) | Mauro (avisos de evento y recordatorio) / equipo (canales) | [notificaciones.md](./notificaciones.md) |
| Bot de Telegram (difusión de eventos y cancelaciones) | Mauro | [integracion-telegram.md](./integracion-telegram.md) |
| Bot de Discord (difusión de eventos) | Seba Velázquez | [integracion-discord.md](./integracion-discord.md) |
| Notificaciones web push y app instalable (PWA) | Gabriel Calisaya | [integracion-web-push.md](./integracion-web-push.md) |
| Agregar evento a Google Calendar | Delia | [integracion-google-calendar.md](./integracion-google-calendar.md) |
| Dashboard administrativo (indicadores y gráficos) | Gabriel Calisaya | [dashboard.md](./dashboard.md) |

## Cómo usar estas guías

*   Cada integrante debería poder explicar de punta a punta el o los circuitos a su cargo: qué problema resuelve, cómo viaja la información entre el frontend y el backend, y por qué se tomaron ciertas decisiones.
*   Los circuitos de la base (autenticación, eventos e inscripciones, notificaciones) los usa todo el sistema, así que conviene que todo el equipo los conozca.
*   Cada guía cierra con "puntos clave para la defensa": son las preguntas más probables y su respuesta corta, con la referencia al archivo y la función donde está el código.
