# Correcciones y Detecciones Pendientes

> Registro de bugs/mejoras detectados durante el desarrollo que **no** se arreglan en la rama donde se encontraron (para no mezclar scope). Cada ítem indica severidad, si es bloqueante y dónde vive.
>
> Auditoría de flujos importantes realizada el **2026-07-05** (auth, inscripciones, eventos, categorías, dashboard, frontend). Ninguno bloquea la rama `feature/telegram-bot`.

## Prioridad sugerida
1. **C-02** (seguridad, ALTA) — escalada de privilegios. Atacar primero.
2. **C-08** (media) — error-handler no mapea errores Sequelize; amplifica C-05, C-07, C-15.
3. Medias: C-03, C-04, C-06, C-07, C-09, C-10, C-11.
4. El resto (bajas): pulido.

## Tabla maestra

| # | Área | Título | Sev | ¿Bloq. rama telegram? | Archivo:línea |
|---|---|---|---|---|---|
| C-01 | Eventos | `setCategorias()` no existe (es `setCategoria`) | Media | No | `services/evento.service.js` crear/actualizar |
| C-02 | Auth | Registro público acepta `rol` → cualquiera se hace ORGANIZADOR | **Alta** | No | `routes/auth.routes.js:23-25` + `services/auth.service.js:33` |
| C-03 | Auth | `two_factor_enabled` default `true` pero login ignora 2FA | Media | No | `models/usuario.model.js:44-48` vs `services/auth.service.js` login |
| C-04 | Inscripciones | `inscribirse` no valida `evento.estado` (permite BORRADOR/CANCELADO) | Media | No | `services/inscripcion.service.js` inscribirse |
| C-05 | Auth | Registro concurrente mismo email/username → 500 (debería 409) | Media | No | `services/auth.service.js:15-34` |
| C-06 | Eventos | Catálogo público lista eventos CANCELADOS | Media | No | `services/evento.service.js:11-13` |
| C-07 | Eventos | `descripcion` `allowNull:false` en modelo pero `.optional()` en ruta → 500 | Media | No | `models/evento.model.js:17-20` vs `routes/evento.routes.js` |
| C-08 | Backend | error-handler no mapea errores Sequelize → todo 500 | Media | No | `middlewares/error-handler.middleware.js:6` |
| C-09 | Front | Toast de error duplicado (interceptor + componente) | Media | No | `core/interceptors/error.interceptor.ts:34` + varios componentes |
| C-10 | Front | `event-detail` muestra evento FICTICIO ante error de carga | Media | No | `features/public/event-detail/event-detail.component.ts:64-103` |
| C-11 | Front | Autocompletado de búsqueda muere tras 1 request fallido | Media | No | `layout público` searchSubject (`switchMap` sin `catchError`) |
| C-12 | Inscripciones | Check-in no atómico → doble marca de asistencia en carrera | Baja | No | `services/inscripcion.service.js` checkIn/checkInManual |
| C-13 | Auth | Fallback de `JWT_SECRET` fuera de `production` (staging con NODE_ENV vacío) | Baja | No | `utils/jwt.util.js` |
| C-14 | Categorías | Ruta valida `descripcion` inexistente en el modelo | Baja | No | `routes/categoria.routes.js` vs `models/categoria.model.js` |
| C-15 | Categorías | PUT/DELETE categoría sin validación de UUID → 500 | Baja | No | `routes/categoria.routes.js` |
| C-16 | Dashboard | KPI `totalEventos` cuenta BORRADOR y CANCELADO | Baja | No | `services/dashboard.service.js:14` |
| C-17 | Categorías | Forma de respuesta 404 `{mensaje}` (evento ya usa `{error:{message}}`) | Baja | No | `controllers/categoria.controller.js` |
| C-18 | Front | Countdown muestra "NaNd NaNh NaNm" si el evento no tiene fecha | Baja | No | `shared/components/countdown/countdown.component.ts` |
| C-19 | Front | Badge de notificaciones no se refresca tras login en la misma sesión | Baja | No | `layout público` ngOnInit |
| C-20 | Front | `checkinPct` calcula % sobre `cupo_maximo` en vez de sobre inscriptos | Baja | No | `features/admin/attendees/attendee-list.component.ts:37-41` |
| C-21 | Front | Promedio de valoración `0` se muestra como "Sin datos" (falsy) | Baja | No | `features/admin/dashboard/dashboard.component.ts` template |
| C-22 | Front (app-wide) | JWT guardado en `localStorage` → robable vía XSS | Media | No | `core/services/auth.service.ts` (`guardarSesion`/`guardarToken`) |

---

### C-22 — Token JWT en `localStorage` (decisión de proyecto)
Detectado al revisar T-11 (OAuth/2FA). El token de sesión se persiste en `localStorage`, accesible por cualquier script → un XSS puede robarlo. **No es específico de T-11:** es el patrón de auth de toda la app (login normal, registro y OAuth usan el mismo `guardarSesion`). Migrarlo a **cookie httpOnly** implica rehacer el interceptor, los guards y el manejo de sesión en todo el front + emitir la cookie desde el backend en login/registro/2FA/OAuth. **Fix:** planificar la migración a cookie httpOnly como tarea transversal de seguridad (no dentro de T-11).

---

## Detalle de los ítems relevantes

### C-01 — `evento.setCategorias()` no es una función
**Archivo:** `services/evento.service.js` (`crear` y `actualizar`).
El accessor real es **`setCategoria`** (Sequelize nombró la asociación `belongsToMany` como `"Categoria"`, singular). Asignar categorías a un evento lanza `TypeError: evento.setCategorias is not a function`. Latente mientras el front no mande `categorias`.
**Fix:** `setCategorias`→`setCategoria` (o declarar la asociación con `as: 'categorias'` y ajustar los `include`). Dominio T-09 → coordinar.

### C-02 — Escalada de privilegios en el registro público 🔴
**Archivos:** `routes/auth.routes.js` (valida `rol` como opcional `isIn`) + `services/auth.service.js` (`rol: rol || 'ASISTENTE'`).
`POST /api/auth/registro` con body `{ "rol": "ORGANIZADOR", ... }` crea un usuario **con rol admin** que pasa `roleMiddleware(['ORGANIZADOR'])` (gestión de eventos, check-in, listados). Es una vulnerabilidad de control de acceso (consigna §5).
**Fix:** en el registro público **ignorar/forzar** `rol: 'ASISTENTE'` (no leerlo del body). La promoción a ORGANIZADOR solo por un endpoint protegido para admins. Quitar `rol` de `validacionRegistro`.
**Repro:**
```
POST /api/auth/registro  { nombre, username, email, password, "rol":"ORGANIZADOR" }
→ usuario creado como ORGANIZADOR
```

### C-08 — El error-handler devuelve 500 para errores de Sequelize
**Archivo:** `middlewares/error-handler.middleware.js`.
`status = err.status || err.statusCode || 500`. Los errores de Sequelize (`SequelizeUniqueConstraintError`, `SequelizeValidationError`, cast de UUID) no traen `.status` → siempre 500. Esto **amplifica** C-05, C-07 y C-15 (deberían ser 409/400).
**Fix:** mapear `err.name` antes del fallback (`SequelizeUniqueConstraintError`→409, `SequelizeValidationError`/notNull→400, cast UUID→400).

### C-10 — `event-detail` fabrica un evento falso ante un error
**Archivo:** `features/public/event-detail/event-detail.component.ts` (`cargarDatos` error → `cargarMock`).
Ante 404 o backend caído, en vez de mostrar el estado de error, renderiza un evento hardcodeado ("Hackathon Universitaria Convoca 2026", cupo 50). El usuario puede intentar inscribirse a algo inexistente y `error()` nunca se setea.
**Fix:** eliminar el fallback a mock; en `error` hacer `this.error.set(...)` + `loading.set(false)`.

---

## Notas
- La lógica de **cupo / lista de espera** (con `LOCK.UPDATE` sobre el evento) y el **no-oversell** están OK. No hay fuga de `password`.
- Contratos front↔back de auth, inscripciones, notificaciones y dashboard **alineados** (parseo `error.error.error.message` correcto).
- C-13 es en parte por diseño (fallback de dev), pero conviene endurecerlo para staging.
