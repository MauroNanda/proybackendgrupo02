# Bitácora del Proyecto y Estado Actual

## Estado Global
Todas las tareas del plan (Fase 1 y Fase 3, T-00 a T-15) están implementadas y en la rama principal de ambos repositorios.

## Repositorios
*   **Backend:** https://github.com/MauroNanda/proybackendgrupo02
*   **Frontend:** https://github.com/MauroNanda/proyfrontendgrupo02

El repositorio del backend concentra la documentación general del proyecto (propuesta, arquitectura, consigna, bitácora, convenciones, flujo de trabajo). El repositorio del frontend tiene su propia documentación de instalación y convenciones, que enlaza a la del backend.

## Funcionalidades implementadas

### Autenticación y seguridad
*   Registro e inicio de sesión con email y contraseña (contraseñas cifradas). El registro siempre crea usuarios con rol Asistente.
*   Inicio de sesión con Google (OAuth).
*   Verificación en dos pasos (2FA) opcional, con código enviado por email y control de intentos.
*   La sesión usa una cookie protegida: el token no queda expuesto a scripts del navegador.
*   Roles (Asistente y Organizador) que limitan el acceso a las rutas y pantallas administrativas.
*   Auditoría de acciones e historial de accesos en la base de datos.
*   Manejo uniforme de errores: respuestas con códigos claros, sin exponer detalles internos.

### Eventos e inscripciones
*   Administración de eventos y categorías: crear, editar, publicar y cancelar.
*   Catálogo público con filtros y detalle del evento. Muestra solo eventos publicados.
*   Inscripción con control de cupo, lista de espera y cancelación. No permite inscribirse a eventos cancelados o ya realizados.
*   Check-in de asistentes desde el panel del organizador y exportación de listados a Excel y PDF.
*   Botón "Agregar a Google Calendar" en el detalle del evento.

### Notificaciones
*   Notificaciones personales por tres canales (en la app, email y push del navegador) cuando: se confirma la inscripción, el usuario queda en lista de espera, se libera un cupo, se cancela un evento donde está inscripto, o cambia su fecha o lugar.
*   Recordatorio automático 24 horas antes del evento a los inscriptos confirmados.
*   Registro en la base de datos de las notificaciones enviadas.

### Integraciones externas
*   **Google OAuth:** inicio de sesión con cuenta de Google.
*   **Telegram:** un bot difunde en un canal los eventos publicados y sus cancelaciones.
*   **Discord:** un bot difunde en un canal los eventos publicados.
*   **Web push + PWA:** la app se puede instalar y envía notificaciones del navegador, incluso con la pestaña cerrada.
*   **Google Calendar:** botón para agendar el evento en el calendario del usuario.
*   **Resend (email):** envío de los correos de avisos y códigos 2FA.

### Dashboard
*   Panel administrativo con indicadores (usuarios, eventos publicados, valoraciones) y gráficos.

## Pendientes
*   Configurar la cuenta de Resend para el envío de emails reales.
*   Los recordatorios automáticos requieren que el servidor esté activo; si el hosting suspende el proceso, el aviso se envía cuando el servidor vuelve a ejecutarse.
