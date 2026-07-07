# Mis Inscripciones y Edición de Perfil — Guía de defensa

**Responsable:** Mauro

## Qué hace

El circuito cubre dos funcionalidades relacionadas con la experiencia del usuario:

1. **Mis Inscripciones:** página personal que lista todas las inscripciones del usuario con sus estados, datos del evento, pase de acceso con código QR (descargable en PDF) y opción de cancelación para eventos futuros.
2. **Edición de Perfil:** formulario donde el usuario edita su nombre visible (por ahora, el único campo editable).

## Endpoints

- `GET /api/inscripciones/mis-inscripciones`: lista inscripciones del usuario autenticado.
- `DELETE /api/inscripciones/:eventoId`: cancela una inscripción.
- `GET /api/auth/perfil`: obtiene datos del perfil del usuario.
- `PUT /api/auth/perfil`: actualiza el nombre del usuario.

## Archivos clave

**Backend:** routes/inscripcion.routes.js, routes/auth.routes.js, controllers/inscripcion.controller.js, controllers/auth.controller.js, services/inscripcion.service.js, services/auth.service.js.

**Frontend:** mis-inscripciones.component.ts/html, perfil.component.ts/html, inscripcion.service.ts, auth.service.ts.

## Puntos clave para la defensa

1. **Seguridad de datos:** Backend filtra inscripciones por `usuarioId` del JWT. Un usuario no puede ver ni cancelar las inscripciones de otro.
2. **QR en cliente:** Generado con `qrcode.js` en el navegador. No se renderiza en el servidor.
3. **PDF en cliente:** Usa `html2canvas` + `jsPDF` para capturar el modal y descargarlo como PDF.
4. **Cancelación lógica:** Cambia estado a CANCELADO (soft delete), permitiendo auditoría y re-inscripción posterior.
5. **Promoción automática:** Cuando un usuario cancela una inscripción CONFIRMADO, el primero en ESPERA pasa automáticamente a CONFIRMADO.
6. **Validación de nombre:** Obligatorio y con máximo de caracteres. Validado en backend (express-validator) y frontend (formulario reactivo).
7. **Edición limitada:** Solo nombre es editable; email y rol son de solo lectura. 2FA se activa desde pantalla separada.
8. **Precarga de datos:** El perfil carga los datos actuales y el nombre se refleja inmediatamente en el navbar tras guardar.
9. **Orden de inscripciones:** Se ordenan por fecha del evento (próximas primero), no por createdAt.
10. **Manejo de errores:** Mensajes detallados si algo falla (ej. inscripción ya cancelada, evento pasado).

## Fuera del circuito (contexto para defender)

- **Dos vistas de inscripciones:** El detalle del evento (`/eventos/:id`) muestra si está inscripto y permite cancelar desde allí. `/mis-inscripciones` es la vista consolidada de todas.
- **QR y check-in:** El `qr_token` de la inscripción se escanea el día del evento. El pase muestra el QR en grande para facilitar el escaneo.
- **Historial:** Las inscripciones canceladas quedan registradas en la BD (estado CANCELADO) para auditoría.
