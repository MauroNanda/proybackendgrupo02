# Convenciones de Código y Buenas Prácticas

Este documento define las reglas de estilo y patrones que **todo código** del proyecto debe seguir. Aplica tanto para humanos como para agentes de IA.

## 1. Frontend (Angular 22)
*   **Arquitectura:** Standalone Components. No usar `app.module.ts`.
*   **Reactividad:** Uso de **Signals** (`signal`, `computed`, `effect`) donde sea posible. RxJS se permite para llamadas HTTP (`HttpClient`) y Observables complejos.
*   **UI/UX:** Usar **Bootstrap 5** como sistema de estilos principal (exigido por la consigna). Grid system, componentes (Navbar, Cards, Modales, Dropdowns) y clases utilitarias de Bootstrap deben ser visibles en el HTML. Para los íconos de la interfaz, usar exclusivamente **Bootstrap Icons** (`<i class="bi bi-icon-name"></i>`), evitando el uso de emojis dentro de los templates.
*   **Formularios:** Usar exclusivamente `ReactiveFormsModule` (exigido por la consigna). No usar template-driven forms. Los formularios deben tener validaciones personalizadas con feedback visual en tiempo real.
*   **Componentes:** Mantenerlos pequeños y con responsabilidad única. Separar "Dumb components" (solo UI, reciben datos por `@Input`) de "Smart components" (contienen lógica, llaman servicios).
*   **Diseño Responsivo:** Mobile-first (exigido por la consigna). Todo debe verse correctamente en móvil, tablet y desktop.

## 2. Backend (Node + Express + Sequelize)
*   **Arquitectura:** **MVC** (exigido por la consigna). Las carpetas principales son `controllers/`, `models/`, `routes/`. Se agrega una capa `services/` para la lógica de negocio.
*   **Controladores delgados:** El controlador solo recibe `req`, llama al servicio y devuelve `res`. Nunca debe contener lógica de negocio directamente.
*   **Servicios con la lógica:** Toda validación, cálculo o regla de negocio va en el archivo `.service.js` correspondiente.
*   **ORM:** Sequelize con relaciones explícitas. Las migraciones son la única forma de modificar la estructura de la BD.
*   **Seguridad:** Todo endpoint debe pasar por los middlewares de autenticación (JWT), rol y sanitización según corresponda.
*   **Auditoría:** Las acciones sensibles (crear, editar, eliminar, inscribirse) deben ser registradas por el middleware de auditoría.

## 3. Comentarios para la Defensa
Dado que es un Trabajo Final que debe ser defendido ante los profesores por un equipo de 5 personas:
*   **Comentar el "por qué", no el "qué":** No escribir `// Obtiene todos los eventos` (eso es obvio). Sí escribir `// Filtramos solo eventos PUBLICADOS porque los BORRADOR no deben ser visibles para los asistentes`.
*   **Comentar relaciones de BD:** En cada modelo de Sequelize, explicar qué representa la relación (`// Un Evento pertenece a un Usuario (el organizador que lo creó)`).
*   **Comentar integraciones:** Todo código que interactúe con Telegram, Discord, Google OAuth o Resend debe tener un bloque de comentarios explicando el flujo completo.
*   **Comentar middlewares de seguridad:** Explicar qué ataque previene cada middleware y cómo lo hace.

## 4. Nomenclatura
*   **Archivos:** `kebab-case` (ej. `evento.service.js`, `event-card.component.ts`).
*   **Clases/Componentes:** `PascalCase` (ej. `EventoService`, `EventCardComponent`).
*   **Variables y funciones:** `camelCase` (ej. `cupoMaximo`, `getEventosPublicados()`).
*   **Tablas de BD (Sequelize):** `PascalCase` singular (ej. `Usuario`, `Evento`, `Inscripcion`).
*   **Rutas API:** `kebab-case` plural (ej. `/api/eventos`, `/api/inscripciones`).

## 5. Guía de Integración de Features (Evitar Conflictos)

Para evitar conflictos de fusión en Git al trabajar en paralelo, el proyecto utiliza un esquema modular donde **no hace falta editar archivos compartidos centralizados** al agregar modelos y rutas en el backend, y se delegan las rutas en el frontend.

### 5.1 Cómo agregar un Modelo (Backend)
1. Creá tu archivo en `models/` con la extensión `.model.js` (ej. `models/categoria.model.js`).
2. El cargador dinámico de `models/index.js` lo importará automáticamente.
3. Si tu modelo tiene relaciones con otros, **declarálas dentro de su método estático `associate`** en el mismo archivo. Ejemplo:
   ```javascript
   static associate(models) {
     this.belongsTo(models.Usuario, { foreignKey: 'organizadorId', as: 'organizador' });
   }
   ```

### 5.2 Cómo agregar una Ruta (Backend)
1. Creá tu archivo en `routes/` con la extensión `.routes.js` (ej. `routes/evento.routes.js`).
2. Si tu ruta sigue el nombre plural convencional (ej. `/api/eventos`), exportá directamente el router:
   ```javascript
   // routes/evento.routes.js
   module.exports = router;
   ```
3. Si querés un prefijo explícito (ej. `/api/auth` en vez de `/api/auths`), exportá un objeto con `prefix` y `router`:
   ```javascript
   // routes/auth.routes.js
   module.exports = { prefix: '/auth', router };
   ```
4. El cargador dinámico de `routes/index.js` lo montará de manera automática en el servidor.

### 5.3 Cómo integrar Rutas en el Frontend (Angular)
Para evitar tocar `app.routes.ts` constantemente:
1. Creá un archivo de rutas propio dentro de tu carpeta de feature (ej. `src/app/features/public/eventos.routes.ts` o `auth.routes.ts`).
2. Exportá tu array de rutas desde ese archivo:
   ```typescript
   import { Routes } from '@angular/router';
   export const authRoutes: Routes = [
     { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) }
   ];
   ```
3. En `app.routes.ts`, importá tus rutas usando `loadChildren` en el layout correspondiente:
   ```typescript
   // app.routes.ts (única línea que tocarás)
   children: [
     {
       path: '',
       loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
     }
   ]
   ```

