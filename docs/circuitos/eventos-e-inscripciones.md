# Circuito: Eventos e Inscripciones (núcleo del sistema)

**Responsable:** equipo. Todos los demás circuitos (notificaciones, integraciones, estadísticas) se cuelgan de este.

## Qué hace

Cubre el ciclo de vida completo de un evento: el organizador lo crea, lo categoriza y lo publica; el público lo ve en un catálogo con filtros por categoría y estado; el asistente se inscribe (con control de cupo y lista de espera automática), puede cancelar (lo que promueve al primero en espera) y el día del evento registra su asistencia con un código QR o mediante check-in manual del organizador.

## Modelo de datos

- **Evento** (`models/evento.model.js`): `titulo`, `descripcion`, `fecha`, `ubicacion`, `cupo_maximo` y `estado` ENUM `BORRADOR | PUBLICADO | CANCELADO` (default `BORRADOR`).
- **Inscripcion** (`models/inscripcion.model.js`): une `usuarioId` + `eventoId`, con `estado` ENUM `CONFIRMADO | ESPERA | CANCELADO | ASISTIO` y un `qr_token` UUID **único** que es la credencial de acceso. Tiene índice `(eventoId, estado)` porque el conteo de cupo filtra por esos dos campos.
- **Categoria** (`models/categoria.model.js`) y **EventoCategoria** (`models/evento-categoria.model.js`): relación muchos-a-muchos. Del lado de Evento la asociación se expone con alias **`categorias`** (`Evento.belongsToMany(Categoria, { as: 'categorias' })`), y es lo que el frontend recibe dentro de cada evento.

## Flujo paso a paso

### (a) Crear / publicar un evento (organizador)

1. En el panel admin, `admin/events/event-form/event-form.component.ts` arma un formulario reactivo (`titulo`, `descripcion`, `fecha`, `ubicacion`, `cupo_maximo`, `estado`) con validador propio de fecha futura (`futureDateValidator`, que se desactiva en modo edición).
2. Al guardar, llama a `EventoService.crear()` o `actualizar()` (front, `core/services/evento.service.ts`) → `POST /eventos` o `PUT /eventos/:id`.
3. En el backend, `routes/evento.routes.js` protege ambas rutas con `authMiddleware` + `roleMiddleware(['ORGANIZADOR'])` y valida con express-validator (título obligatorio y ≤ 200 caracteres, fecha ISO futura, `cupo_maximo` entero ≥ 1, `estado` dentro del ENUM).
4. `controllers/evento.controller.js → crear()/actualizar()` delega en `services/evento.service.js`:
   - `crear()` separa `categorias` del resto de los datos, crea el evento y asocia las categorías con `evento.setCategorias(categorias)`. Si nace `PUBLICADO`, dispara la difusión (`eventosHooks.alPublicarEvento`, Telegram/Discord).
   - `actualizar()` valida que **no se pueda reducir el cupo por debajo de los confirmados/asistidos actuales**; detecta la transición a `PUBLICADO` (difusión) o a `CANCELADO` (da de baja en bloque las inscripciones activas y notifica a cada inscripto); y si sigue publicado pero cambió fecha o ubicación, avisa a los inscriptos (`eventoModificado`).
5. La respuesta vuelve con el evento y sus `categorias`, y el front redirige al listado admin (`event-list.component.ts`), que carga con `obtenerTodos({ todos: true })` para ver también los BORRADOR.

### (b) Ver catálogo público y filtrar

1. `public/event-catalog/event-catalog.component.ts` carga en paralelo las categorías (`CategoriaService.getAll()` → `GET /categorias`, ruta pública) y los eventos (`EventoService.obtenerTodos()` → `GET /eventos`, sin parámetros).
2. En el backend, `evento.service.js → listar(categoria, todos, search)`: si no viene `todos=true`, filtra `estado IN ('PUBLICADO', 'CANCELADO')` — los BORRADOR **nunca** aparecen al público. Incluye las `categorias` de cada evento (asociación N:M con `through: { attributes: [] }` para no arrastrar la tabla intermedia) y las `inscripciones` (solo `id` y `estado`, para calcular ocupación). Soporta `?categoria=nombre` (where sobre el include) y `?search=texto` (`iLike` sobre título).
3. El catálogo aplica los filtros visibles **en el cliente** (`filtrarEventos()`): por `estado` (`evento.estado === filtroEstado`) y por categoría (`evento.categorias?.some(c => c.nombre === filtroCategoria)`). Como el back ya mandó cada evento con su array `categorias`, el filtro es un simple `some` en memoria.
4. Cada tarjeta enlaza al detalle: `GET /eventos/:id` (`evento.service.js → obtenerPorId`, también con `categorias` incluidas).

### (c) Inscribirse (con cupo y lista de espera)

1. En `public/event-detail/event-detail.component.ts`, si el usuario está logueado se consulta su estado con `GET /inscripciones/estado/:eventoId` (devuelve `{ inscrito, estado, qr_token }`). El botón "Inscribirme" llama a `InscripcionService.inscribirse(eventoId)` → `POST /inscripciones` con `{ eventoId }`.
2. Todas las rutas de `routes/inscripcion.routes.js` pasan por `authMiddleware` (el `usuarioId` sale del JWT, nunca del body).
3. `services/inscripcion.service.js → inscribirse()` hace todo dentro de **una transacción de Sequelize con bloqueo de fila**:
   1. Busca el evento con `lock: t.LOCK.UPDATE` (`SELECT ... FOR UPDATE`): otra inscripción concurrente al mismo evento queda esperando hasta el commit.
   2. Con la fila ya bloqueada valida las reglas de negocio: `BORRADOR` → 404 (se trata como inexistente para no revelar eventos no publicados); `CANCELADO` → 409; `fecha < ahora` → 409 (el evento ya se realizó).
   3. Rechaza duplicados: si el usuario ya tiene inscripción en estado `CONFIRMADO`, `ESPERA` o `ASISTIO` → 400.
   4. Cuenta los cupos ocupados dentro de la transacción (`Inscripcion.count` con `estado IN ('CONFIRMADO','ASISTIO')` — la lista de espera y los cancelados no ocupan cupo) y decide: `estado = totalConfirmados >= evento.cupo_maximo ? 'ESPERA' : 'CONFIRMADO'`.
   5. Crea la inscripción con un `qr_token` nuevo (`crypto.randomUUID()`), o **reutiliza** el registro si el usuario tenía una inscripción `CANCELADO` (re-inscripción con token regenerado).
4. Fuera de la transacción se notifica al usuario (`inscripcionConfirmada` o `inscripcionEnEspera`): es un efecto secundario que no puede romper la inscripción.
5. El front muestra el toast según el estado devuelto ("CONFIRMADA" o "LISTA DE ESPERA") y recarga el estado; si quedó confirmado, genera el QR **en el cliente** con la librería `qrcode` a partir del `qr_token` (`generarQrLocal`), descargable como pase en PDF.

### (d) Cancelar inscripción y promoción del siguiente en espera

1. Botón "Cancelar inscripción" en el detalle → `DELETE /inscripciones/:eventoId`.
2. `inscripcion.service.js → cancelar()` también es transaccional:
   1. Busca la inscripción activa del usuario (`estado IN ('CONFIRMADO','ESPERA')`); si no hay → 404.
   2. La pasa a `CANCELADO`.
   3. **Solo si estaba `CONFIRMADO`** (si estaba en espera no liberó cupo): busca al primero de la lista de espera (`estado: 'ESPERA'`, `order: createdAt ASC` — FIFO, el que llegó primero) con `lock: t.LOCK.UPDATE` y lo pasa a `CONFIRMADO`.
3. Fuera de la transacción se notifica al promovido con `notificaciones.cupoLiberado(usuario, evento)`, pasándole el evento para que sepa de cuál se liberó el cupo.

### (e) Check-in (QR y manual)

1. **Por QR:** el asistente muestra el QR de su pase (que codifica su `qr_token`). El escaneo termina en `POST /inscripciones/check-in` con `{ qr_token }` (expuesto en el front por `InscripcionService.checkIn()`). `inscripcion.service.js → checkIn(qrToken)` busca la inscripción por `qr_token` (columna única): si no existe → 404 "Código QR no válido"; si ya está `ASISTIO` → 400 (no se puede registrar dos veces); si no está `CONFIRMADO` (espera/cancelado) → 400. Si pasa, marca `estado = 'ASISTIO'`.
2. **Manual:** el organizador abre la lista de inscriptos de un evento (`admin/attendees/attendee-list.component.ts` → `GET /inscripciones/evento/:eventoId`, ruta con `roleMiddleware(['ORGANIZADOR'])`), que devuelve filas paginadas (limit clampado a 100), filtro por `estado` y búsqueda por nombre/email del usuario, más `stats` agrupadas por estado. El botón de asistencia llama a `POST /inscripciones/:id/check-in-manual` (con `auditMiddleware`, queda auditado) → `checkInManual(id)`, con las mismas validaciones de estado que el check-in por QR.
3. El front actualiza la fila a `ASISTIO` y ajusta las estadísticas (CONFIRMADO−1, ASISTIO+1) sin recargar.

## Archivos involucrados

### Backend

| Archivo | Rol |
|---|---|
| `routes/evento.routes.js` | Rutas de eventos: GET públicas; POST/PUT/DELETE solo ORGANIZADOR, con validaciones express-validator (fecha futura, cupo ≥ 1, estado del ENUM). |
| `controllers/evento.controller.js` | Traduce HTTP ↔ servicio: parsea `?categoria`, `?todos`, `?search` en `listar` y delega el resto. |
| `services/evento.service.js` | Lógica de eventos: listado con filtros e includes, creación con categorías, actualización con detección de publicar/cancelar/modificar, borrado transaccional en cascada. |
| `routes/inscripcion.routes.js` | Rutas de inscripciones, todas con `authMiddleware`; las de admin (inscriptos por evento, check-in manual) exigen ORGANIZADOR. |
| `controllers/inscripcion.controller.js` | Saca el `usuarioId` del JWT (`req.usuario.id`) y delega en el servicio. |
| `services/inscripcion.service.js` | Corazón del circuito: transacción de inscripción con bloqueo de fila, decisión CONFIRMADO/ESPERA, cancelación con promoción FIFO, check-in QR y manual, listado de inscriptos con stats. |
| `routes/categoria.routes.js` | GET público; POST/PUT/DELETE solo ORGANIZADOR. |
| `services/categoria.service.js` | ABM simple de categorías; el `getAll` incluye los eventos asociados (id y título). |
| `models/evento.model.js` | Entidad Evento con ENUM de estado y `cupo_maximo`; asociaciones `categorias` (N:M) e `inscripciones` (1:N). |
| `models/inscripcion.model.js` | Entidad Inscripcion con ENUM de 4 estados, `qr_token` UUID único e índice `(eventoId, estado)`. |
| `models/categoria.model.js` | Entidad Categoria (nombre único). |
| `models/evento-categoria.model.js` | Tabla intermedia `EventoCategorias` de la relación N:M. |

### Frontend

| Archivo | Rol |
|---|---|
| `core/services/evento.service.ts` | Cliente HTTP de `/eventos` (CRUD + listado con `todos`, `search`, `categoria`). |
| `core/services/categoria.service.ts` | Cliente HTTP de `/categorias`. |
| `core/services/inscripcion.service.ts` | Cliente HTTP de `/inscripciones`: estado, inscribirse, cancelar, check-in QR y manual, inscriptos por evento, mis inscripciones. |
| `features/public/event-catalog/event-catalog.component.ts` | Catálogo público: carga eventos y categorías y filtra en cliente por estado y por nombre de categoría. |
| `features/public/event-detail/event-detail.component.ts` | Detalle del evento: estado de inscripción del usuario, inscribirse/cancelar, generación local del QR del pase, PDF y link a Google Calendar. |
| `features/admin/events/event-list/event-list.component.ts` | Listado admin con `todos: true` (incluye BORRADOR), filtro/orden en cliente (fecha, título, ocupación) y eliminación. |
| `features/admin/events/event-form/event-form.component.ts` | Alta/edición del evento con formulario reactivo y validador de fecha futura. |
| `features/admin/categories/category-list/category-list.component.ts` y `category-form/` | ABM de categorías con conteo de eventos asociados por categoría. |
| `features/admin/attendees/attendee-list.component.ts` | Panel de inscriptos por evento: búsqueda, filtro por estado, paginación, stats, check-in manual y export a Excel. |

## Puntos clave para la defensa

1. **Cupo con transacción y bloqueo de fila** — `services/inscripcion.service.js → inscribirse()`. Todo (validaciones + conteo + creación) ocurre dentro de `sequelize.transaction`, y el evento se lee con `lock: t.LOCK.UPDATE` (en PostgreSQL, `SELECT ... FOR UPDATE`). Si dos usuarios se inscriben a la vez al último cupo, la segunda transacción **espera** a que la primera commitee; cuando le toca, el `count` ya ve la inscripción nueva y decide `ESPERA`. Sin el lock, ambas contarían el mismo número y se sobrevendería el cupo.

2. **Estados de inscripción** — `models/inscripcion.model.js`, ENUM de 4 estados: `CONFIRMADO` (tiene cupo), `ESPERA` (cupo lleno, cola FIFO), `CANCELADO` (baja; el registro se conserva y se reutiliza si se re-inscribe), `ASISTIO` (hizo check-in). Ocupan cupo `CONFIRMADO` y `ASISTIO` (así el conteo no se rompe cuando la gente empieza a hacer check-in); `ESPERA` y `CANCELADO` no.

3. **Reglas de negocio de inscripción** — `inscribirse()` en `services/inscripcion.service.js`: no se puede inscribir a un `BORRADOR` (404, se oculta su existencia), a un `CANCELADO` (409) ni a un evento cuya `fecha` ya pasó (409). Estas validaciones se hacen **con la fila del evento ya bloqueada**, así una cancelación del evento concurrente no se cruza con la inscripción. Además, duplicado activo → 400.

4. **Promoción desde lista de espera** — `services/inscripcion.service.js → cancelar()`. Cancelación y promoción son **atómicas** (misma transacción). Solo se promueve si el que cancela estaba `CONFIRMADO` (si estaba en espera no se liberó ningún cupo). El elegido es el primero por `createdAt ASC` (orden de llegada), leído con lock para que dos cancelaciones simultáneas no promuevan al mismo.

5. **Filtro por categoría en el catálogo** — la asociación N:M se expone como `categorias` (alias en `models/evento.model.js`). El back puede filtrar en servidor (`GET /eventos?categoria=Nombre`, where sobre el include en `evento.service.js → listar()`), y el catálogo (`event-catalog.component.ts → filtrarEventos()`) filtra en cliente con `evento.categorias?.some(c => c.nombre === filtroCategoria)`. El público solo ve `PUBLICADO` y `CANCELADO`; los `BORRADOR` requieren `?todos=true` (usado por el panel admin).

6. **Check-in por QR** — el `qr_token` (UUID único, `models/inscripcion.model.js`) es la credencial: el front lo dibuja como QR localmente (sin llamar al servidor), y el check-in valida que exista, que no se haya usado (`ASISTIO` previo → 400) y que la inscripción esté `CONFIRMADO`. Al re-inscribirse tras una cancelación, el token se **regenera**: el QR viejo queda inválido. El check-in manual del organizador (`checkInManual`) aplica las mismas reglas y queda auditado (`auditMiddleware` en la ruta).

7. **Integridad al editar eventos** — `services/evento.service.js → actualizar()`: no deja reducir `cupo_maximo` por debajo de los confirmados/asistidos actuales (400), y al cancelar un evento pasa a `CANCELADO` todas las inscripciones activas en bloque (capturándolas antes para poder notificar). `eliminar()` borra en transacción inscripciones + relaciones con categorías + evento, para no dejar registros huérfanos.

## Bloques de código clave

### 1. Transacción de inscripción con bloqueo de fila (`services/inscripcion.service.js`)

```javascript
const { inscripcionFinal, estadoFinal, evento } = await sequelize.transaction(async (t) => {
  // Bloquea la fila del evento (SELECT ... FOR UPDATE): otra inscripción
  // concurrente al mismo evento espera hasta que esta transacción commitee.
  const evento = await Evento.findByPk(eventoId, {
    transaction: t,
    lock: t.LOCK.UPDATE,
  });
  if (!evento) {
    throw new HttpError('El evento no existe', 404);
  }
  // ... validaciones de estado/fecha y duplicado (bloque 2) ...

  // El conteo se hace DENTRO de la transacción: ve el estado consistente.
  const totalConfirmados = await Inscripcion.count({
    where: { eventoId, estado: ['CONFIRMADO', 'ASISTIO'] },
    transaction: t,
  });

  // Decisión de cupo: si está lleno, va a lista de espera.
  const estado = totalConfirmados >= evento.cupo_maximo ? 'ESPERA' : 'CONFIRMADO';
  const nuevoQrToken = crypto.randomUUID();
  // ... crea la inscripción (o reutiliza una CANCELADO) con ese estado y token ...
});
```

### 2. Reglas de negocio: estado y fecha del evento (`services/inscripcion.service.js`, dentro de la misma transacción)

```javascript
// BORRADOR se trata como inexistente (404) para no revelar eventos no publicados.
if (evento.estado === 'BORRADOR') {
  throw new HttpError('El evento no existe', 404);
}
// CANCELADO y fecha pasada son conflictos con el estado del recurso (409).
if (evento.estado === 'CANCELADO') {
  throw new HttpError('El evento fue cancelado y no admite inscripciones', 409);
}
// fecha es timestamptz: comparar contra new Date() es seguro (ambas en UTC).
if (evento.fecha && new Date(evento.fecha) < new Date()) {
  throw new HttpError('El evento ya se realizó y no admite nuevas inscripciones', 409);
}
```

### 3. Cancelación con promoción del primero en espera (`services/inscripcion.service.js → cancelar()`)

```javascript
insc.estado = 'CANCELADO';
await insc.save({ transaction: t });

// Solo si el que cancela estaba CONFIRMADO se liberó un cupo real.
let promovido = null;
if (estadoAnterior === 'CONFIRMADO') {
  const siguienteEnEspera = await Inscripcion.findOne({
    where: { eventoId, estado: 'ESPERA' },
    order: [['createdAt', 'ASC']],   // FIFO: el que llegó primero
    transaction: t,
    lock: t.LOCK.UPDATE,             // dos cancelaciones no promueven al mismo
  });
  if (siguienteEnEspera) {
    siguienteEnEspera.estado = 'CONFIRMADO';
    await siguienteEnEspera.save({ transaction: t });
    promovido = siguienteEnEspera.usuarioId;
  }
}
```

### 4. Catálogo: filtro por estado, búsqueda y categoría (`services/evento.service.js → listar()`)

```javascript
if (!todos) {
  // El público nunca ve BORRADOR; sí ve CANCELADO (para saber que se canceló).
  where.estado = { [Op.in]: ['PUBLICADO', 'CANCELADO'] };
}
if (search) {
  where.titulo = { [Op.iLike]: `%${search}%` };   // búsqueda case-insensitive
}
const include = [
  // Cada evento sale con su array `categorias` (alias de la asociación N:M).
  { model: Categoria, as: 'categorias', through: { attributes: [] } },
  { model: Inscripcion, as: 'inscripciones', attributes: ['id', 'estado'], required: false },
];
if (categoria) {
  include[0].where = { nombre: categoria };   // filtro server-side por categoría
}
```

### 5. Check-in por QR (`services/inscripcion.service.js → checkIn()`)

```javascript
const inscripcion = await Inscripcion.findOne({
  where: { qr_token: qrToken },   // columna UUID única: el token ES la credencial
  include: [
    { model: Evento, as: 'evento' },
    { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }
  ]
});
if (!inscripcion) {
  throw new HttpError('Código QR de inscripción no válido', 404);
}
if (inscripcion.estado === 'ASISTIO') {   // el QR no se puede usar dos veces
  throw new HttpError('La asistencia ya fue registrada previamente para esta inscripción', 400);
}
if (inscripcion.estado !== 'CONFIRMADO') { // ESPERA o CANCELADO no entran
  throw new HttpError('Solo se puede realizar el check-in para inscripciones confirmadas', 400);
}
inscripcion.estado = 'ASISTIO';
await inscripcion.save();
```

## Fuera del circuito (contexto para defender)

- **Por qué el público ve también los CANCELADO.** El filtro de `listar()` deja pasar `PUBLICADO` y `CANCELADO` a propósito: si el evento cancelado desapareciera del catálogo, alguien que lo vio publicado no sabría si se canceló o si no lo está encontrando. Se muestra con su marca de cancelado para comunicar la baja. `BORRADOR`, en cambio, es trabajo en curso del organizador y nunca sale sin `?todos=true`.

- **El borrado de evento es en transacción.** `evento.service.js → eliminar()` borra dentro de una misma transacción las inscripciones del evento, las filas de `EventoCategorias` y el evento. Si algo falla a mitad de camino se revierte todo: no quedan inscripciones ni relaciones apuntando a un evento que ya no existe.

- **Índices y constraints que sostienen el circuito.** En `models/inscripcion.model.js`: `qr_token` es único (el check-in busca por esa columna con índice único), `idx_inscripciones_evento_estado` sobre `(eventoId, estado)` cubre el conteo de cupo y el panel de inscriptos, e `idx_inscripciones_usuario` cubre "mis inscripciones". Aparte, `Categoria.nombre` es único (no hay categorías duplicadas) y `Usuario.email` también (es lo que permite vincular la cuenta de Google sin duplicar usuarios).

- **El QR es un token, no datos.** El código QR codifica solo el `qr_token` (UUID v4: 122 bits aleatorios, no se adivina por fuerza bruta). No lleva id de usuario ni de evento; el backend resuelve la inscripción buscando por esa columna única, así el pase no expone datos personales de nadie que lo vea.

- **La difusión al publicar es de otro circuito.** `crear()` y `actualizar()` disparan `eventosHooks.alPublicarEvento` / `alCancelarEvento` (`integrations/eventos.hooks.js`); los anuncios a Telegram y Discord se registran en `integrations/register.js` y corren aislados con `try/catch`, así una falla del bot no rompe el alta ni la edición del evento.
