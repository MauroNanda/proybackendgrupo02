# Circuito: Dashboard administrativo (indicadores y gráficos)

**Responsable:** Gabriel Calisaya

## Qué hace

Panel de control exclusivo para usuarios con rol ORGANIZADOR que resume el estado del sistema: cuatro KPIs (usuarios totales, eventos publicados, inscripciones activas y promedio de valoraciones) y tres gráficos hechos con Chart.js (inscripciones por mes, distribución de inscripciones por estado y eventos por estado). Los números se calculan en el backend con agregaciones de Sequelize sobre PostgreSQL.

## Flujo paso a paso

1. **El organizador entra a `/admin` (Panel de Control)** — el componente `DashboardComponent` se monta y en `ngAfterViewInit()` dispara `cargarDatos()`.
2. **El front pide los dos endpoints en paralelo** — con `forkJoin` de RxJS: `GET /api/dashboard/kpis` y `GET /api/dashboard/charts`. Mientras tanto muestra un spinner (`cargando` es un signal).
3. **El backend valida acceso** — `dashboard.routes.js` aplica `authMiddleware` (JWT válido) y `roleMiddleware(['ORGANIZADOR'])` a todas las rutas del router. Un asistente logueado recibe 403.
4. **El servicio consulta la BD** — `dashboard.service.js`:
   - `obtenerKpis()` lanza 4 consultas en paralelo con `Promise.all`: `Usuario.count()`, `Evento.count({ estado: 'PUBLICADO' })`, `Inscripcion.count({ estado IN (CONFIRMADO, ASISTIO) })` y `AVG(puntuacion)` sobre `Valoracion`.
   - `obtenerDatosGraficos()` lanza 3 consultas agregadas: inscripciones agrupadas por mes (últimos 6 meses, `DATE_TRUNC('month', "createdAt")`), inscripciones agrupadas por estado y eventos agrupados por estado.
5. **El controlador responde JSON** — `dashboard.controller.js` solo delega en el servicio y devuelve el resultado tal cual (o pasa el error al middleware con `next(err)`).
6. **El front renderiza** — los KPIs se muestran en 4 tarjetas (signals + `@if`); los datos de gráficos se transforman (labels de meses en español, `parseInt` de los totales, colores por estado) y se crean 3 instancias de Chart.js sobre elementos `<canvas>` referenciados con `@ViewChild`. El botón "Actualizar" destruye los charts y repite el ciclo.

## Archivos involucrados

**Backend (`proybackendgrupo02`):**

| Archivo | Rol |
|---|---|
| `routes/dashboard.routes.js` | Monta `GET /api/dashboard/kpis` y `GET /api/dashboard/charts`. Aplica `authMiddleware` + `roleMiddleware(['ORGANIZADOR'])` a nivel router (`router.use`), así ninguna ruta queda desprotegida. |
| `controllers/dashboard.controller.js` | Capa fina: `kpis()` y `charts()` llaman al servicio y responden JSON. |
| `services/dashboard.service.js` | Toda la lógica de consulta: `obtenerKpis()` y `obtenerDatosGraficos()` con agregaciones de Sequelize (`count`, `fn('AVG')`, `fn('COUNT')`, `group`, `literal`). Usa los modelos `Usuario`, `Evento`, `Inscripcion` y `Valoracion`. |

No usa variables de entorno propias (solo la conexión a la BD que ya usa toda la app).

**Frontend (`proyfrontendgrupo02`):**

| Archivo | Rol |
|---|---|
| `src/app/features/admin/dashboard/dashboard.component.ts` | Componente standalone completo: pide los datos con `HttpClient` + `forkJoin`, maneja estados con signals (`cargando`, `error`, `kpis`), y arma los 3 gráficos con Chart.js (barra vertical, dona y barra horizontal). Incluye la tarjeta "Operatividad del Servidor". |

## Puntos clave para la defensa

1. **Qué mide cada KPI y por qué (`obtenerKpis()` en `services/dashboard.service.js`):**
   - *Usuarios:* `Usuario.count()` — todos los registrados.
   - *Eventos:* solo `estado: 'PUBLICADO'` — los borradores son trabajo en curso y los cancelados ya se ven desglosados en el gráfico "eventos por estado"; así el KPI coincide con el catálogo público.
   - *Inscripciones:* solo `CONFIRMADO` y `ASISTIO` — representan presencia real; se excluyen canceladas y en lista de espera.
   - *Valoración:* `AVG(puntuacion)` con `fn('AVG', col('puntuacion'))`, redondeado a 1 decimal; si no hay valoraciones devuelve `null` y el front muestra "Sin datos".
2. **Rendimiento:** tanto los 4 KPIs como las 3 consultas de gráficos se ejecutan en paralelo con `Promise.all`, y el front pide ambos endpoints a la vez con `forkJoin`. La latencia total es la de la consulta más lenta, no la suma.
3. **Agrupación por mes:** se usa `literal(`DATE_TRUNC('month', "createdAt")`)` en `attributes`, `group` y `order`. Se usa `literal` (SQL crudo) en vez de `fn()` para controlar el quoting de la columna camelCase `"createdAt"` en Postgres. El rango son los últimos 6 meses: `seisAtras` se calcula restando 5 meses y fijando el día 1 a las 00:00, y filtra con `createdAt >= seisAtras`.
4. **La BD agrega, el front dibuja:** el backend devuelve filas ya agrupadas (`{ mes, total }`, `{ estado, total }`); no manda las tablas enteras. El front solo mapea a labels/valores para Chart.js. Detalle: `COUNT` llega como string desde Postgres, por eso el componente hace `parseInt(r.total, 10)`.
5. **Seguridad por rol:** `router.use(authMiddleware)` + `router.use(roleMiddleware(['ORGANIZADOR']))` en `routes/dashboard.routes.js`. La protección está en el backend; el guard del front es solo UX.
6. **Gráficos en el front (`dashboard.component.ts`):** `crearBarraMes()` (barra vertical), `crearTortaEstados()` (doughnut con `cutout: '60%'`), `crearBarraEventos()` (barra horizontal, `indexAxis: 'y'`). Los colores por estado salen del mapa `ESTADO_COLORES` (ej. CONFIRMADO azul, ASISTIO verde, CANCELADO rojo, ESPERA amarillo). Los charts se guardan en un array y se destruyen en `ngOnDestroy()` y antes de recargar, para no duplicar instancias sobre el mismo canvas.
7. **Detalle de Angular:** tras recibir datos, los canvas recién existen cuando el `@if (!cargando())` re-renderiza; por eso `crearGraficos()` se llama dentro de un `setTimeout(..., 0)` — se espera un tick para que el DOM esté listo.
8. **Manejo de errores:** si cualquiera de los dos requests falla, `forkJoin` cae al `error` y el componente muestra un alert con mensaje claro; el botón "Actualizar" permite reintentar.

## Bloques de código clave

**1. KPIs en paralelo con Sequelize (`services/dashboard.service.js`)**

```javascript
async obtenerKpis() {
  // Las 4 consultas corren en paralelo: la latencia es la de la más lenta
  const [totalUsuarios, totalEventos, totalInscripciones, valoracionResult] = await Promise.all([
    Usuario.count(),

    // Solo publicados: alineado con el catálogo público
    Evento.count({ where: { estado: 'PUBLICADO' } }),

    // Solo inscripciones con presencia real (ni canceladas ni en espera)
    Inscripcion.count({
      where: { estado: { [Op.in]: ['CONFIRMADO', 'ASISTIO'] } },
    }),

    // Promedio de valoraciones: AVG en la BD, no en JS
    Valoracion.findOne({
      attributes: [[fn('AVG', col('puntuacion')), 'promedio']],
      raw: true,
    }),
  ]);

  return {
    totalUsuarios,
    totalEventos,
    totalInscripciones,
    promedioValoracion: valoracionResult?.promedio
      ? parseFloat(parseFloat(valoracionResult.promedio).toFixed(1)) // 1 decimal
      : null, // sin valoraciones → el front muestra "Sin datos"
  };
}
```

**2. Inscripciones por mes con DATE_TRUNC (`services/dashboard.service.js`)**

```javascript
// Últimos 6 meses: primer día del mes, 5 meses atrás
const seisAtras = new Date();
seisAtras.setMonth(seisAtras.getMonth() - 5);
seisAtras.setDate(1);
seisAtras.setHours(0, 0, 0, 0);

// DATE_TRUNC agrupa por mes en Postgres; literal() para el quoting de "createdAt"
const inscripcionesPorMes = await Inscripcion.findAll({
  attributes: [
    [literal(`DATE_TRUNC('month', "createdAt")`), 'mes'],
    [fn('COUNT', col('id')), 'total'],
  ],
  where: { createdAt: { [Op.gte]: seisAtras } },
  group: [literal(`DATE_TRUNC('month', "createdAt")`)],
  order: [[literal(`DATE_TRUNC('month', "createdAt")`), 'ASC']],
  raw: true, // devuelve objetos planos { mes, total } listos para el front
});
```

**3. Rutas protegidas por rol (`routes/dashboard.routes.js`)**

```javascript
// Solo los organizadores tienen acceso al panel administrativo
router.use(authMiddleware);                    // exige JWT válido
router.use(roleMiddleware(['ORGANIZADOR']));   // exige rol ORGANIZADOR (si no, 403)

router.get('/kpis', dashboardController.kpis);
router.get('/charts', dashboardController.charts);

module.exports = { prefix: '/dashboard', router }; // el autoloader monta /api/dashboard
```

**4. Carga en paralelo y armado de gráficos en el front (`dashboard.component.ts`)**

```typescript
private cargarDatos(): void {
  // forkJoin dispara ambos GET a la vez y emite cuando los dos terminan
  forkJoin({
    kpis: this.http.get<KpiData>(`${this.apiUrl}/kpis`),
    graficos: this.http.get<ChartData>(`${this.apiUrl}/charts`),
  }).subscribe({
    next: ({ kpis, graficos }) => {
      this.kpis.set(kpis);          // signal → actualiza las 4 tarjetas
      this.cargando.set(false);
      // Un tick para que Angular renderice los <canvas> del @if antes de dibujar
      setTimeout(() => this.crearGraficos(graficos), 0);
    },
    error: () => {
      this.error.set('No se pudieron cargar las métricas. Verificá que el servidor esté corriendo.');
      this.cargando.set(false);
    },
  });
}

private crearBarraMes(rows: MesRow[]): void {
  const labels = rows.map((r) => {
    const d = new Date(r.mes);
    return `${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`; // "Jul 2026"
  });
  const valores = rows.map((r) => parseInt(r.total, 10)); // COUNT llega como string

  this.charts.push(
    new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Inscripciones', data: valores, backgroundColor: '#2A5C8A' }] },
      options: { responsive: true, maintainAspectRatio: false },
    }),
  );
}
```
