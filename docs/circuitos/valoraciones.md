# Valoraciones de Eventos — Guía de defensa

**Responsable:** Gabriel Calisaya

## Qué hace

Los usuarios que asistieron a un evento o que están confirmados en un evento que ya finalizó pueden valorarlo con una puntuación de 1 a 5 y un comentario opcional (máximo 500 caracteres). El frontend valida quién puede valorar usando la misma regla que el backend; si el usuario ya valoró, la aplicación precarga su valoración y le permite editarla. El backend implementa un upsert (crear o actualizar) con validación de acceso.

## Flujo paso a paso

1. El usuario está en la página de detalle de un evento (`/eventos/:id`), donde el componente cargó los datos del evento y su estado de inscripción (si está autenticado).
2. El componente calcula si puede valorar usando la regla: está inscripto con estado `ASISTIO` O (estado `CONFIRMADO` y el evento ya finalizó).
3. Si puede valorar, se muestra la sección de "Valorá este evento" con un formulario de selección de puntuación y un textarea para comentario.
4. Si existe una valoración anterior, el formulario se precarga con esos datos (puntuación y comentario).
5. El usuario selecciona una puntuación (1 a 5) y opcionalmente escribe un comentario (se valida máximo 500 caracteres en cliente).
6. Al hacer click en "Enviar valoración" o "Actualizar valoración", el componente ejecuta `enviarValoracion()`:
   - Valida que el formulario sea válido (puntuación requerida, comentario dentro del límite).
   - Llama a `valoracionService.guardar({ evento_id, puntuacion, comentario? })`.
   - El backend recibe la solicitud autenticada (via JWT en la cookie httpOnly).
7. El backend valida:
   - El evento existe.
   - El usuario está inscripto.
   - El estado de la inscripción permite valorar: `ASISTIO` o (`CONFIRMADO` y fecha del evento < ahora).
   - Si falla, devuelve 403 Forbidden.
8. Si la validación pasa, se busca una valoración existente del usuario para ese evento:
   - Si existe, actualiza puntuación y comentario.
   - Si no existe, crea una nueva.
9. Se devuelve la valoración (creada o actualizada) con estado 201 (si es nueva) o 200 (si es actualización).
10. El frontend recibe la respuesta, actualiza la señal `valoracion`, muestra un toast de éxito y deshabilita el estado de guardando.

## Archivos involucrados

### Backend

| Archivo | Rol |
|---|---|
| `routes/valoracion.routes.js` | Define las rutas POST `/` (guardar/actualizar) y GET `/evento/:eventoId` (obtener mi valoración), con validaciones y middleware de autenticación. |
| `controllers/valoracion.controller.js` | Controlador simple que extrae `req.usuario.id` y parámetros, delegando lógica al servicio. |
| `services/valoracion.service.js` | Contiene la lógica: validaciones de evento, inscripción y estado; upsert de Valoracion. |
| `models/valoracion.model.js` | Modelo Sequelize con campos: `id` (UUID), `usuario_id`, `evento_id`, `puntuacion` (1–5), `comentario` (opcional). Sin timestamps. |

### Frontend

| Archivo | Rol |
|---|---|
| `src/app/core/services/valoracion.service.ts` | Servicio Angular que expone dos métodos: `guardar(datos)` (POST) y `obtenerMiValoracion(eventoId)` (GET), ambos contra `/valoraciones`. |
| `src/app/features/public/event-detail/event-detail.component.ts` | Lógica del detalle: carga evento, inscripción, y valoración; define `puedeValorar` como computed (usando el mismo criterio que el backend); formulario reactivo con puntuación y comentario; método `enviarValoracion()`. |
| `src/app/features/public/event-detail/event-detail.component.html` | Vista: muestra sección de valoración solo si `puedeValorar()` es true; formulario con select (1–5) y textarea; botón de envío/actualización con estado de guardando. |

## Puntos clave para la defensa

- **Validación dual: backend y frontend.** El frontend replica la regla con `puedeValorar()` como computed (inspecciona estado de inscripción y fecha del evento) para una UX inmediata: oculta el formulario si no puede valorar. El backend valida idénticamente en `guardar()`: comprueba el estado de la inscripción y devuelve 403 si no es `ASISTIO` o (`CONFIRMADO` y evento finalizado). Esto previene que un cliente malicioso salte el frontend y acceda a validaciones del servidor. (Ver `puedeValorar()` en `event-detail.component.ts` línea 52 y `valoracionService.guardar()` en `valoracion.service.js` línea 24.)
- **Upsert (crear o actualizar).** El servicio busca una valoración existente del usuario para ese evento. Si existe, actualiza `puntuacion` y `comentario`; si no, crea una nueva con `Valoracion.create()`. Esto permite al usuario cambiar su valoración sin tener historiales o duplicados. (Ver `guardar()` en `valoracion.service.js` líneas 35–51.)
- **Validación de puntuación 1–5.** Express-validator comprueba que sea entero entre 1 y 5; Sequelize lo valida también en el modelo con `validate: { min: 1, max: 5 }`. El frontend usa un `<select>` con opciones fijas (no input libre) para garantizar el rango. (Ver `validacionGuardar` en `routes/valoracion.routes.js` línies 11–13 y modelo línea 20–23.)
- **Comentario opcional con límite.** Express-validator comprueba máximo 500 caracteres; Sequelize lo almacena como `TEXT` permitiendo null. El textarea del frontend tiene atributo `maxlength="500"` y el formulario valida `isLength({ max: 500 })`. Se envía solo si el usuario lo completa (el cliente lo trimea antes de enviar para ignorar espacios vacíos). (Ver validación línea 14–18, modelo línea 25–28, y componente línea 145.)
- **Precarga de valoración existente.** Al cargar el detalle del evento, `cargarValoracion()` obtiene la valoración anterior y la carga en el formulario con `valoracionForm.patchValue()`. El título del botón cambia a "Actualizar valoración" si existe una valoración previa, mejorando la UX. (Ver `cargarValoracion()` en `event-detail.component.ts` líneas 112–129 y HTML línea 254.)
- **Manejo de errores.** El backend devuelve 403 si el usuario no puede valorar (no inscripto, inscripción cancelada, evento no finalizado con estado CONFIRMADO). El frontend no muestra el formulario en esos casos. El toast de error lo maneja el interceptor. (Ver `enviarValoracion()` en componente línea 151–156.)
- **Integración con inscripciones.** La valoración depende del estado de la inscripción, que se obtiene en `cargarEstadoInscripcion()`. Esto asegura que si la inscripción se cancela después de que el usuario valoró, futuras validaciones del backend la rechazarán. (Ver líneas 97–110.)

## Bloques de código clave

Cálculo de puede valorar (frontend, `event-detail.component.ts`, `puedeValorar`):

```typescript
readonly puedeValorar = computed(() => {
  const evt = this.evento();
  const ins = this.inscripcion();
  if (!evt || !ins.inscrito || !this.authService.isLoggedIn()) return false;

  // El evento finalizó si su fecha ya pasó
  const finalizado = evt.fecha ? new Date(evt.fecha) < new Date() : false;
  // Puede valorar si asistió, o si está confirmado y el evento finalizó
  return ins.estado === 'ASISTIO' || (ins.estado === 'CONFIRMADO' && finalizado);
});
```

Validación y upsert (backend, `valoracion.service.js`, método `guardar`):

```javascript
async guardar(usuarioId, { evento_id, puntuacion, comentario }) {
  const evento = await Evento.findByPk(evento_id);
  if (!evento) {
    throw new HttpError('Evento no encontrado', 404);
  }

  const inscripcion = await Inscripcion.findOne({
    where: { usuarioId, eventoId: evento_id },
  });

  if (!inscripcion) {
    throw new HttpError('Debés estar inscripto para valorar este evento', 403);
  }

  const eventoFinalizado = new Date(evento.fecha) < new Date();
  const puedeValorar =
    inscripcion.estado === 'ASISTIO' ||
    (inscripcion.estado === 'CONFIRMADO' && eventoFinalizado);

  if (!puedeValorar) {
    throw new HttpError(
      'Podés valorar cuando hayas asistido o cuando el evento haya finalizado',
      403
    );
  }

  const existente = await Valoracion.findOne({
    where: { usuario_id: usuarioId, evento_id },
  });

  if (existente) {
    existente.puntuacion = puntuacion;
    existente.comentario = comentario || null;
    await existente.save();
    return existente;
  }

  return Valoracion.create({
    usuario_id: usuarioId,
    evento_id,
    puntuacion,
    comentario: comentario || null,
  });
}
```

Envío de valoración (frontend, `event-detail.component.ts`, método `enviarValoracion`):

```typescript
enviarValoracion(): void {
  const evt = this.evento();
  if (!evt || this.valoracionForm.invalid) {
    this.valoracionForm.markAllAsTouched();
    return;
  }

  this.guardandoValoracion.set(true);
  const { puntuacion, comentario } = this.valoracionForm.getRawValue();

  this.valoracionService
    .guardar({
      evento_id: evt.id,
      puntuacion,
      comentario: comentario.trim() || undefined,
    })
    .subscribe({
      next: (valoracion) => {
        this.valoracion.set(valoracion);
        this.toastService.success('¡Gracias por tu valoración!');
        this.guardandoValoracion.set(false);
      },
      error: () => {
        this.guardandoValoracion.set(false);
      },
    });
}
```

Formulario reactivo (frontend, `event-detail.component.ts`):

```typescript
readonly valoracionForm = this.fb.nonNullable.group({
  puntuacion: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
  comentario: ['', Validators.maxLength(500)],
});
```

Sección HTML de valoración (`event-detail.component.html`, líneas 209–257):

```html
<div
  *ngIf="puedeValorar()"
  class="valoracion-section mt-4 p-3 bg-white rounded-4 border border-light shadow-sm"
>
  <h4 class="h6 fw-bold mb-3 text-dark-blue">
    <i class="bi bi-star-fill me-1 text-warning"></i>
    {{ valoracion() ? 'Tu valoración' : 'Valorá este evento' }}
  </h4>

  <form [formGroup]="valoracionForm" (ngSubmit)="enviarValoracion()" class="text-start">
    <label class="form-label small fw-semibold" for="puntuacion">Puntuación</label>
    <select
      id="puntuacion"
      class="form-select form-select-sm mb-3"
      formControlName="puntuacion"
    >
      <option [ngValue]="5">5 — Excelente</option>
      <option [ngValue]="4">4 — Muy bueno</option>
      <option [ngValue]="3">3 — Bueno</option>
      <option [ngValue]="2">2 — Regular</option>
      <option [ngValue]="1">1 — Malo</option>
    </select>

    <label class="form-label small fw-semibold" for="comentario"
      >Comentario (opcional)</label
    >
    <textarea
      id="comentario"
      class="form-control form-control-sm mb-3"
      rows="3"
      maxlength="500"
      formControlName="comentario"
      placeholder="Contanos qué te pareció..."
    ></textarea>

    <button
      type="submit"
      class="btn btn-primary btn-sm w-100"
      [disabled]="guardandoValoracion() || valoracionForm.invalid"
    >
      <span
        *ngIf="guardandoValoracion()"
        class="spinner-border spinner-border-sm me-1"
        aria-hidden="true"
      ></span>
      {{ valoracion() ? 'Actualizar valoración' : 'Enviar valoración' }}
    </button>
  </form>
</div>
```

Rutas (backend, `routes/valoracion.routes.js`):

```javascript
router.post('/', validacionGuardar, valoracionController.guardar);
router.get('/evento/:eventoId', validacionEventoId, valoracionController.miValoracion);
```

## Fuera del circuito (contexto para defender)

- **Por qué se valida en ambos lados.** El frontend oculta el formulario si no puede valorar (UX fluida), pero el backend valida nuevamente si se recibe una solicitud maliciosa (seguridad). Esto previene que alguien modifique el HTML o envíe un PUT con curl para saltarse el control de acceso.
- **Quién puede valorar.** Solo usuarios inscriptos en estado `ASISTIO` (ya asistieron y lo registraron con QR) o en estado `CONFIRMADO` cuyo evento ya finalizó. Un usuario con inscripción cancelada no puede valorar, ni tampoco uno que no está inscripto. Esto asegura que solo quien participó puntúe.
- **Puntuación y comentario separados.** La puntuación es obligatoria (1–5), el comentario es opcional. Esto permite al usuario rápidamente valorar sin escribir si lo desea, pero también abre la posibilidad de aportar feedback textual. Ambos se almacenan en la misma tabla.
- **Upsert vs. versioning.** Se usa un upsert simple (actualizar si existe) en lugar de un historial de versiones. Si el usuario cambia su valoración de 5 a 3, la anterior se sobrescribe. Esto es un trade-off: perdemos historial pero evitamos complejidad y datos duplicados. Si se necesitara auditoría, se agregaría una tabla de auditoría en el futuro.
- **Límite de 500 caracteres en comentario.** Se eligió un límite razonable para evitar comentarios enormes que saturan la BD o la UI. Se valida tanto en frontend (con atributo `maxlength`) como en backend (express-validator).
- **Integración con inscripciones y eventos.** La valoración tiene claves foráneas a `Usuario`, `Evento` e `Inscripcion` (implícita vía validación). Si el evento se borra, las valoraciones de ese evento podrían quedar huérfanas (según política de cascada; revisar migraciones de BD). Si el usuario se borra, sus valoraciones se eliminan si hay ON DELETE CASCADE. Esto se maneja en el nivel de BD.
- **Sin timestamps en la tabla.** La tabla `Valoracion` no tiene `createdAt` ni `updatedAt` por diseño, ya que lo que importa es la valoración actual, no cuándo se hizo. Si se necesitara saber cuándo se valoró un evento, se agregaría `createdAt`.
