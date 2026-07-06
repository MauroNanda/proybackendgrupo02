# Integración Google Calendar — Guía de defensa

**Responsable:** Delia

## Qué hace

Desde el detalle de un evento, el usuario puede tocar el botón "Agregar a Google Calendar" y se abre Google Calendar en otra pestaña con el evento ya prellenado (título, fecha de inicio y fin, descripción y ubicación). Es una integración **solo de frontend**: no usa la API de Google Calendar ni OAuth; simplemente construye una URL con los datos del evento y la abre.

## Flujo paso a paso

1. El usuario está en la página de detalle de un evento (`/eventos/:id`), donde el componente ya cargó los datos del evento desde el backend.
2. Toca el botón "Agregar a Google Calendar" (visible en la columna principal del detalle).
3. El componente ejecuta `agregarAGoogleCalendar()`:
   - Valida que el evento tenga fecha; si no la tiene, muestra un toast de advertencia y corta.
   - Calcula la fecha de fin sumando 2 horas a la de inicio (duración por defecto).
   - Arma la URL `https://calendar.google.com/calendar/render?action=TEMPLATE` con los parámetros `text`, `dates`, `details` y `location`, escapando cada valor con `encodeURIComponent`.
4. Abre esa URL en una pestaña nueva con `window.open(url, '_blank', 'noopener')`.
5. Google Calendar muestra el formulario de "crear evento" ya completo; el usuario solo confirma con "Guardar" en su propia cuenta.

## Archivos involucrados

Ambos en el repositorio **frontend** (`proyfrontendgrupo02`):

| Archivo | Rol |
|---|---|
| `src/app/features/public/event-detail/event-detail.component.ts` | Lógica: `agregarAGoogleCalendar()` arma y abre la URL; `formatearFechaGoogle()` convierte fechas al formato que exige Google. |
| `src/app/features/public/event-detail/event-detail.component.html` | Vista: botón "Agregar a Google Calendar" con `(click)="agregarAGoogleCalendar()"`. |

## Puntos clave para la defensa

- **No necesita API key ni OAuth.** No se llama a ningún endpoint de Google ni se piden permisos sobre el calendario del usuario. Solo se arma un enlace público (`calendar.google.com/calendar/render?action=TEMPLATE`) que Google interpreta como plantilla de evento. La sesión de Google la resuelve el propio navegador del usuario: si está logueado, ve el formulario prellenado; si no, Google le pide iniciar sesión. (Ver `agregarAGoogleCalendar()` en `event-detail.component.ts`.)
- **Formato de fecha que exige Google.** El parámetro `dates` debe ir como `YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ` (inicio/fin) en **UTC**, indicado por la `Z` final. El helper `formatearFechaGoogle()` parte de `toISOString()` (que ya devuelve UTC) y le quita guiones, dos puntos y milisegundos para llegar a ese formato. Al enviar la hora en UTC, Google la muestra convertida a la zona horaria del calendario del usuario.
- **Duración por defecto de 2 horas.** El backend guarda una sola fecha para el evento, pero Google requiere inicio y fin; el componente calcula el fin sumando 2 horas al inicio (`fin.setHours(fin.getHours() + 2)`).
- **Apertura segura con `noopener`.** La pestaña se abre con `window.open(url, '_blank', 'noopener')`, de modo que la página nueva no puede acceder a `window.opener` de nuestra aplicación (previene *tabnabbing*: que la pestaña abierta redirija o manipule la pestaña original).
- **Datos escapados con `encodeURIComponent`.** Título, descripción y ubicación pueden contener espacios, tildes o caracteres especiales (`&`, `#`, etc.); se escapan para no romper la URL ni mezclar parámetros.
- **Manejo del caso sin fecha.** Si el evento no tiene `fecha`, no se abre nada: se muestra un toast de advertencia ("Este evento no tiene una fecha definida.") y la función retorna.

## Bloques de código clave

Armado y apertura de la URL (`event-detail.component.ts`, `agregarAGoogleCalendar()`):

```typescript
agregarAGoogleCalendar(): void {
  const evento = this.evento();

  // Sin fecha no hay nada que agendar: se avisa y se corta.
  if (!evento?.fecha) {
    this.toastService.warning('Este evento no tiene una fecha definida.');
    return;
  }

  const inicio = new Date(evento.fecha);

  // Google exige fecha de fin; se asume una duración de 2 horas.
  const fin = new Date(inicio);
  fin.setHours(fin.getHours() + 2);

  // URL de plantilla de Google Calendar:
  //  - text:     título del evento
  //  - dates:    inicio/fin en formato UTC (YYYYMMDDTHHMMSSZ)
  //  - details:  descripción
  //  - location: ubicación
  // encodeURIComponent escapa espacios, tildes y caracteres especiales.
  const url =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(evento.titulo)}` +
    `&dates=${this.formatearFechaGoogle(inicio)}/${this.formatearFechaGoogle(fin)}` +
    `&details=${encodeURIComponent(evento.descripcion ?? '')}` +
    `&location=${encodeURIComponent(evento.ubicacion ?? '')}`;

  // noopener: la pestaña nueva no puede acceder a window.opener (evita tabnabbing).
  window.open(url, '_blank', 'noopener');
}
```

Formato de fecha que pide Google (`event-detail.component.ts`, `formatearFechaGoogle()`):

```typescript
// Formato que espera Google Calendar en `dates`: YYYYMMDDTHHMMSSZ (UTC).
private formatearFechaGoogle(fecha: Date): string {
  return fecha
    .toISOString()               // "2026-07-06T18:30:00.000Z" (ya en UTC)
    .replace(/[-:]/g, '')        // quita guiones y dos puntos -> "20260706T183000.000Z"
    .replace(/\.\d{3}Z$/, 'Z');  // quita milisegundos -> "20260706T183000Z"
}
```

Botón en la vista (`event-detail.component.html`):

```html
<button class="btn btn-outline-success" (click)="agregarAGoogleCalendar()">
  <i class="bi bi-calendar-plus me-2"></i>
  Agregar a Google Calendar
</button>
```
