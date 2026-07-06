# Propuesta y Alcance del Proyecto: Convoca

> **Referencia:** Este documento se lee junto con `CONSIGNA-TP-FINAL.md`, que contiene los requisitos formales de la cátedra. Cada sección indica qué requisitos cubre. Todo lo descripto aquí está implementado.

## 1. Visión General
**Convoca** es un sistema web para gestionar eventos universitarios (charlas, talleres, hackathons). Los asistentes exploran un catálogo, se inscriben y reciben avisos por varios canales. Los organizadores crean y administran los eventos, controlan la asistencia y siguen la actividad desde un panel con indicadores y gráficos.

---

## 2. Roles del Sistema
> *Cubre: Consigna §1 "múltiples roles de usuario" y §5 "control de acceso por roles".*

*   **Asistente:** explora eventos, se inscribe, recibe notificaciones y gestiona su participación. Todo registro nuevo crea un usuario con este rol.
*   **Organizador:** crea, edita, publica y cancela eventos. Accede al panel de administración con indicadores, listas de inscriptos y herramientas de gestión.

---

## 3. Doble Vista
> *Cubre: Consigna §3 "componentes organizados en frontend Angular" y §7 "panel administrativo".*

### 3.1 Vista Asistente (app pública)
Interfaz responsiva (Bootstrap 5). El asistente encuentra:
*   Catálogo de eventos con filtros, búsqueda y categorías. Muestra solo eventos publicados.
*   Detalle del evento con inscripción y botón "Agregar a Google Calendar".
*   Perfil personal con sus inscripciones.
*   Centro de notificaciones dentro de la app (campana).

### 3.2 Vista Organizador (panel de administración)
Panel privado de gestión. El organizador encuentra:
*   Dashboard con indicadores y gráficos (usuarios, eventos, inscripciones).
*   Administración de eventos y categorías: crear, editar, publicar y cancelar.
*   Lista de inscriptos por evento, con exportación a PDF y Excel.
*   Check-in de asistentes por código QR el día del evento.

### 3.3 Protección de Rutas
*   Las rutas administrativas se protegen por rol, tanto en el frontend (guards de Angular) como en el backend (middleware).
*   Un asistente que intenta acceder al panel de administración es redirigido.
*   Un organizador puede acceder a ambas vistas.

---

## 4. Funcionalidades

### 4.1 Autenticación y Seguridad
> *Cubre: Consigna §5 completa (JWT, bcrypt, OAuth, 2FA, XSS, CSRF, auditoría, historial).*

*   **Registro e inicio de sesión** con email y contraseña. Las contraseñas se guardan cifradas.
*   **Inicio de sesión con Google (OAuth 2.0):** el usuario puede registrarse o entrar con su cuenta de Google.
*   **Verificación en dos pasos (2FA):** opcional. Tras ingresar email y contraseña, el sistema envía un código por email que el usuario debe ingresar para completar el acceso. Los intentos fallidos están limitados.
*   **Sesión por cookie protegida:** el token de sesión viaja en una cookie que los scripts del navegador no pueden leer.
*   **Prevención de ataques:** entradas validadas y saneadas contra XSS, protección CSRF, validaciones en frontend y backend.
*   **Auditoría de acciones:** el sistema registra quién hizo qué y cuándo (por ejemplo, "el usuario X creó el evento Y").
*   **Historial de accesos:** cada inicio de sesión queda registrado con usuario, fecha y hora, IP y navegador.
*   **Manejo uniforme de errores:** respuestas con códigos claros, sin exponer detalles internos.

### 4.2 Eventos y Categorías
> *Cubre: Consigna §1 "operaciones CRUD", §2 "métodos HTTP GET, POST, PUT, DELETE", §6 "CRUD completos".*

*   El organizador crea, edita, publica y cancela eventos.
*   Cada evento tiene título, descripción, fecha y hora de inicio y fin, lugar, cupo máximo, categorías y estado (borrador, publicado, cancelado, finalizado).
*   Las categorías se administran por separado y habilitan los filtros del catálogo.
*   El catálogo público muestra solo los eventos publicados.

### 4.3 Inscripciones
*   Un asistente se inscribe a un evento publicado. No puede inscribirse a eventos cancelados o ya realizados.
*   El sistema controla el cupo: si hay lugar, la inscripción se confirma; si el cupo está lleno, el asistente queda en lista de espera.
*   Si alguien cancela, el primero de la lista de espera toma el cupo y recibe un aviso.
*   Cada inscripción genera un código QR único que funciona como entrada.
*   El día del evento, el organizador escanea el QR para registrar la asistencia (check-in).
*   El asistente puede cancelar su inscripción.

### 4.4 Notificaciones
*   Avisos personales por tres canales: dentro de la app, por email y por notificación push del navegador.
*   El asistente recibe un aviso cuando: se confirma su inscripción, queda en lista de espera, se libera un cupo para él, se cancela un evento donde está inscripto, o cambia la fecha o el lugar del evento.
*   Recordatorio automático 24 horas antes del evento a los inscriptos confirmados.
*   Las notificaciones enviadas quedan registradas en la base de datos.

### 4.5 Formularios Reactivos con Validaciones
> *Cubre: Consigna §3 "formularios reactivos con validaciones personalizadas".*

*   Los formularios (registro, login, eventos, categorías) usan `ReactiveFormsModule`.
*   Validaciones propias (por ejemplo, la fecha de fin no puede ser anterior a la de inicio).
*   Los errores de validación se muestran en tiempo real.

---

## 5. Integraciones Externas
> *Cubre: Consigna §4 "al menos cuatro servicios web de terceros".*

| # | Integración | Propósito |
|---|---|---|
| 1 | **Google OAuth 2.0** | Registro e inicio de sesión con cuenta de Google. |
| 2 | **Telegram Bot** | Difunde en un canal los eventos publicados y sus cancelaciones. |
| 3 | **Discord Bot** | Difunde en un canal los eventos publicados. |
| 4 | **Web Push + PWA** | Notificaciones del navegador, incluso con la pestaña cerrada. La app se puede instalar en el dispositivo. |
| 5 | **Google Calendar** | Botón en el detalle del evento para agendarlo en el calendario del usuario. |
| 6 | **Resend (Email)** | Envío de los correos de avisos y de los códigos 2FA. |

Total: **6 APIs externas** (la consigna pide un mínimo de 4).

---

## 6. Dashboard Administrativo
> *Cubre: Consigna §7 (gráficos, tablas, exportación PDF y Excel).*

*   Indicadores generales: usuarios, eventos publicados, inscripciones.
*   Gráficos con las métricas principales.
*   Listas de inscriptos por evento, exportables a PDF y Excel.

---

## 7. Flujos Principales

### Flujo del Asistente
1.  Se registra con el formulario o con su cuenta de Google. Puede activar la verificación en dos pasos.
2.  Explora el catálogo, filtra por categoría y entra al detalle de un evento.
3.  Se inscribe. Si hay cupo, queda confirmado; si no, queda en lista de espera.
4.  Recibe la confirmación en la app, por email y por push del navegador.
5.  Agrega el evento a su calendario con el botón de Google Calendar.
6.  24 horas antes, recibe un recordatorio.
7.  El día del evento, presenta su código QR para el check-in.
8.  Si el evento cambia de fecha o lugar, o se cancela, recibe un aviso. Puede cancelar su inscripción cuando quiera.

### Flujo del Organizador
1.  Ingresa al panel de administración.
2.  Crea un evento con sus datos y categorías, y lo publica.
3.  Al publicarse, los bots de Telegram y Discord lo difunden en sus canales.
4.  Sigue las inscripciones y los indicadores desde el dashboard.
5.  Exporta la lista de inscriptos a PDF o Excel.
6.  El día del evento, escanea los códigos QR para registrar la asistencia.
7.  Si necesita cancelar el evento, el sistema avisa a los inscriptos y lo difunde por Telegram.
