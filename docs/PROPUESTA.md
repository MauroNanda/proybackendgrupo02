# Propuesta y Alcance del Proyecto: Convoca

> **Referencia:** Este documento debe leerse junto con `CONSIGNA-TP-FINAL.md` que contiene los requisitos formales de la cátedra. Cada sección indica qué requisitos de la consigna cubre.

## 1. Visión General
**Convoca** es un sistema web de gestión de eventos universitarios (charlas, talleres, hackathons) con dos interfaces diferenciadas por rol, un sistema de notificaciones multicanal (Telegram, Discord, Email, Push), login social, seguridad avanzada y un dashboard administrativo con gráficos y exportaciones.

---

## 2. Roles del Sistema
> *Cubre: Consigna §1 "múltiples roles de usuario" y §5 "control de acceso por roles".*

*   **Organizador:** Crea, edita y administra eventos. Accede al Panel de Administración con estadísticas, listas de inscriptos y herramientas de gestión.
*   **Asistente:** Explora eventos, se inscribe, recibe notificaciones y gestiona su participación desde la interfaz pública.

---

## 3. Arquitectura de Doble Vista
> *Cubre: Consigna §3 "componentes organizados en frontend Angular" y §7 "panel administrativo".*

### 3.1 Vista Asistente (App Pública — `/eventos`, `/perfil`, etc.)
Interfaz visual, moderna y responsiva (Bootstrap 5, mobile-first). El Asistente encuentra:
*   Catálogo de eventos con filtros dinámicos, búsqueda y categorías.
*   Página de detalle del evento con countdown en vivo e inscripción.
*   Sección "Recomendados para ti" basada en su historial de asistencia.
*   Perfil personal con historial de eventos, certificados y logros.
*   Formulario de valoración post-evento.
*   Centro de notificaciones in-app (campana).

### 3.2 Vista Organizador (Panel de Administración — `/admin/*`)
Dashboard privado con gráficos y herramientas de gestión. El Organizador encuentra:
*   Panel con gráficos de barras, torta y línea (Chart.js / ng2-charts) mostrando inscriptos, asistencia y tendencias.
*   DataTables con filtros, búsqueda y paginación para la lista de inscriptos.
*   Exportación de datos a **PDF** y **Excel**.
*   Formulario para crear, editar y eliminar eventos (incluyendo eventos recurrentes).
*   Scanner QR para marcar asistencia el día del evento.
*   Vista de valoraciones y feedback que dejaron los asistentes.

### 3.3 Protección de Rutas
*   Las rutas `/admin/*` están protegidas por un **Guard** de Angular que verifica el rol.
*   Un Asistente que intente acceder a `/admin/dashboard` es redirigido.
*   Un Organizador puede acceder a ambas vistas.

---

## 4. Features del Sistema

### 4.1 Core (Funcionalidades Base)

#### Auth y Seguridad
> *Cubre: Consigna §5 completa (JWT, bcrypt, OAuth, 2FA, XSS, CSRF, auditoría, historial).*

*   **Registro y Login** con email y contraseña (cifrada con bcrypt, sesión con JWT).
*   **Login Social con Google (OAuth 2.0):** El usuario puede registrarse/iniciar sesión con su cuenta de Google. Cuenta como API externa consumida.
*   **Autenticación de Dos Factores (2FA):** Tras ingresar email y contraseña, el sistema envía un código de verificación por Email (Resend) o por Telegram (si está vinculado). El usuario debe ingresarlo para completar el login.
*   **Prevención de ataques:** Sanitización de inputs contra XSS, protección CSRF con tokens, validaciones tanto en frontend como en backend.
*   **Auditoría de acciones:** Tabla `AuditoriaAccion` que registra quién hizo qué y cuándo (ej: "Usuario X creó el evento Y", "Usuario Z canceló su inscripción").
*   **Historial de accesos:** Tabla `HistorialAcceso` que registra cada login (usuario, fecha/hora, IP, user-agent).
*   Protección de rutas por rol en Backend (middleware) y Frontend (guards).

#### CRUD de Eventos
> *Cubre: Consigna §1 "operaciones CRUD", §2 "métodos HTTP GET, POST, PUT, DELETE", §6 "CRUD completos".*

*   El Organizador puede crear, editar y eliminar eventos.
*   Cada evento tiene: título, descripción, imagen de portada, fecha/hora de inicio y fin, lugar, cupo máximo, categoría(s) y estado (Borrador, Publicado, Finalizado).
*   Los Asistentes ven solo los eventos con estado "Publicado".

#### Inscripciones (Ticketing)
*   Un Asistente puede inscribirse a un evento publicado.
*   El sistema valida que haya cupo disponible antes de confirmar.
*   Cada inscripción genera un `qr_token` único que identifica la entrada.
*   Un Asistente puede cancelar su inscripción.

#### Categorías y Tags
*   El Organizador asigna una o más categorías al evento (Taller, Charla, Hackathon, Deportivo, Cultural, Académico).
*   Las categorías habilitan los filtros dinámicos y las recomendaciones.

#### Formularios Reactivos con Validaciones
> *Cubre: Consigna §3 "formularios reactivos con validaciones personalizadas".*

*   Todos los formularios (registro, login, crear evento, valoración) usan `ReactiveFormsModule`.
*   Validaciones custom (ej: "la fecha de fin no puede ser anterior a la de inicio", "el email debe pertenecer al dominio de la universidad").
*   Feedback visual en tiempo real de los errores de validación.

---

### 4.2 Integraciones API (Factor Novedoso)
> *Cubre: Consigna §4 "al menos cuatro servicios web de terceros".*

| # | Integración | Tipo | Propósito |
|---|---|---|---|
| 1 | **Google OAuth 2.0** | Login Social | Registro e inicio de sesión con cuenta de Google. |
| 2 | **Telegram Bot API** | Notificaciones | Confirmación de inscripción, QR, recordatorios, 2FA. |
| 3 | **Discord Bot** | Difusión | Publicación automática de eventos nuevos en servidor Discord. |
| 4 | **Resend (Email)** | Notificaciones | Emails transaccionales con plantilla HTML (confirmación, 2FA). |
| 5 | **Google Calendar** | Productividad | Link dinámico para agendar eventos en el calendario del usuario. |
| 6 | **Web Push API** | Notificaciones | Notificaciones nativas del navegador/SO. |

Total: **6 APIs externas** (la consigna pide mínimo 4).

---

### 4.3 Features de Experiencia de Usuario

#### Valoraciones Post-Evento
*   Cuando un evento pasa a "Finalizado", los Asistentes con estado `ASISTIO` pueden dejarlo una calificación (1-5 estrellas) y un comentario breve.
*   El Organizador ve el promedio y los comentarios en su panel.

#### Recomendaciones Inteligentes
*   Sección "Recomendados para ti" en la vista del Asistente.
*   Query de Sequelize que cruza las categorías de eventos con el historial del usuario.

#### Countdown en Vivo
*   En el detalle de cada evento, un reloj con cuenta regresiva animada.
*   Implementado con Signals de Angular.

#### Eventos Recurrentes
*   El Organizador puede marcar un evento como recurrente (semanal, quincenal, mensual).
*   El sistema genera automáticamente las próximas instancias.

---

### 4.4 Visualización y Estadísticas (Dashboard)
> *Cubre: Consigna §7 completa (gráficos, DataTables, exportación PDF y Excel).*

*   **Gráficos:** Barras, torta y línea con Chart.js / ng2-charts. Métricas: inscriptos por evento, tasa de asistencia, evolución temporal.
*   **DataTables:** Tablas de inscriptos con filtros, búsqueda por texto y paginación.
*   **Exportación PDF:** Generar reportes y listas de inscriptos en PDF (pdfkit o jsPDF).
*   **Exportación Excel:** Descargar listas de inscriptos en formato .xlsx (exceljs o xlsx).

---

### 4.5 Expansiones Técnicas (Para Robustez)

#### Check-in con Código QR
*   Al inscribirse, el sistema genera una imagen QR basada en el `qr_token`.
*   El Organizador escanea el QR desde la app web para marcar asistencia (`CONFIRMADO` → `ASISTIO`).

#### Listas de Espera (Waitlist)
*   Si el cupo se llena, el siguiente Asistente queda en estado `ESPERA`.
*   Si alguien cancela, el sistema notifica al primero de la lista de espera.

#### Certificados de Asistencia (PDF)
*   Al finalizar un evento, el backend genera un certificado PDF por cada Asistente con estado `ASISTIO`.
*   Se puede descargar desde el perfil o se envía por Telegram/Email.

#### PWA (Progressive Web App) — Opcional
> *Cubre: Consigna §3 "[Opcional] Uso de sitios web progresivos (PWA)".*

*   Hacer la app instalable en dispositivos móviles.
*   Habilita notificaciones Push incluso con el navegador cerrado.

---

## 5. Flujo Principal del Sistema (User Journey)

### Flujo del Asistente
1.  Se registra (formulario o **Login con Google**) y opcionalmente vincula Telegram.
2.  Completa el **2FA** en su primer login.
3.  Explora el catálogo de eventos, usa filtros y ve recomendaciones.
4.  Entra al detalle de un evento, ve el countdown y se inscribe.
5.  Recibe confirmación + QR por **Telegram**, **Email** y/o **Push**.
6.  Hace clic en el botón de **Google Calendar** para agendar la fecha.
7.  24 horas antes, recibe un **recordatorio** automático.
8.  El día del evento, presenta su QR para el **check-in**.
9.  Después del evento, **valora** la experiencia (estrellas + comentario).
10. Recibe su **certificado PDF** y lo ve en su perfil.

### Flujo del Organizador
1.  Se registra como Organizador y accede al **Panel de Administración**.
2.  Crea un evento (con imagen, categoría, cupo, y opcionalmente recurrente).
3.  Lo publica. El **bot de Discord** lo difunde automáticamente.
4.  Monitorea inscripciones y estadísticas desde su **dashboard con gráficos**.
5.  **Exporta** la lista de inscriptos a PDF o Excel.
6.  El día del evento, **escanea QRs** para registrar asistencia.
7.  Marca el evento como "Finalizado". Ve las **valoraciones** y se generan los **certificados**.
