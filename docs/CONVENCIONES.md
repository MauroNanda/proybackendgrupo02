# Convenciones de Código

Reglas que todo código del proyecto debe seguir. Aplican tanto para humanos como para agentes de IA.

## 1. Nomenclatura

*   **Archivos:** `kebab-case` (ej. `evento.service.js`, `event-card.component.ts`).
*   **Clases y componentes:** `PascalCase` (ej. `EventoService`, `EventCardComponent`).
*   **Variables y funciones:** `camelCase`, con nombres de dominio en español (ej. `cupoMaximo`, `getEventosPublicados()`).
*   **Modelos de BD (Sequelize):** `PascalCase` singular (ej. `Usuario`, `Evento`, `Inscripcion`).
*   **Rutas de la API:** `kebab-case` plural (ej. `/api/eventos`, `/api/inscripciones`).

## 2. Backend (Node + Express + Sequelize)

### 2.1 Capas

Arquitectura MVC (exigida por la consigna) con capa de servicios. Cada dominio tiene su modelo, servicio, controlador y archivo de rutas.

*   **Modelo (`models/*.model.js`):** define la tabla, sus validaciones y sus relaciones.
*   **Servicio (`services/*.service.js`):** contiene toda la lógica de negocio: validaciones, cálculos y reglas. Es la única capa que habla con los modelos.
*   **Controlador (`controllers/*.controller.js`):** es delgado: recibe `req`, llama al servicio y devuelve `res`. No contiene lógica de negocio.
*   **Ruta (`routes/*.routes.js`):** asocia endpoints con métodos del controlador y aplica los middlewares.

### 2.2 Reglas

*   Usar Sequelize con relaciones explícitas. Las migraciones son la única forma de modificar la estructura de la BD.
*   Todo endpoint pasa por los middlewares de autenticación (JWT), rol y sanitización según corresponda.
*   Las acciones sensibles (crear, editar, eliminar, inscribirse) se registran con el middleware de auditoría.

### 2.3 Manejo de errores

*   En los servicios, señalar errores de negocio lanzando `HttpError` (`utils/http-error.js`) con mensaje y status: `throw new HttpError('Evento no encontrado', 404)`.
*   En los controladores, envolver la llamada al servicio en `try/catch` y delegar con `next(error)`. No armar respuestas de error a mano en cada controlador.
*   El middleware central (`middlewares/error-handler.middleware.js`) traduce el error a la respuesta HTTP. Es el último middleware registrado en `app.js`.
*   No exponer detalle crudo de la base de datos ni stack traces en producción: el middleware central ya se encarga de eso.

### 2.4 Formato de respuestas

*   Éxito: `res.json(dato)` con el recurso o la lista directamente. Usar `201` al crear.
*   Error: siempre con la forma `{ error: { message } }`. La produce el middleware central.

## 3. Frontend (Angular 22)

*   **Arquitectura:** Standalone Components. No usar `app.module.ts`.
*   **Reactividad:** usar Signals (`signal`, `computed`, `effect`) donde sea posible. RxJS se permite para llamadas HTTP (`HttpClient`) y Observables complejos.
*   **UI/UX:** usar Bootstrap 5 como sistema de estilos principal (exigido por la consigna). Grid, componentes (Navbar, Cards, Modales, Dropdowns) y clases utilitarias deben ser visibles en el HTML. Para íconos, usar exclusivamente Bootstrap Icons (`<i class="bi bi-icon-name"></i>`). No usar emojis en los templates.
*   **Formularios:** usar exclusivamente `ReactiveFormsModule` (exigido por la consigna). No usar template-driven forms. Los formularios deben tener validaciones personalizadas con feedback visual en tiempo real.
*   **Componentes:** pequeños y con responsabilidad única. Separar "dumb components" (solo UI, reciben datos por `@Input`) de "smart components" (contienen lógica, llaman servicios).
*   **Diseño responsivo:** mobile-first (exigido por la consigna). Todo debe verse correctamente en móvil, tablet y desktop.

## 4. Comentarios

*   **Explicar el "por qué", no el "qué".** No escribir `// Obtiene todos los eventos` (es obvio). Sí escribir `// Filtramos solo eventos PUBLICADOS porque los BORRADOR no deben ser visibles para los asistentes`.
*   **Relaciones de BD:** en cada modelo de Sequelize, explicar qué representa la relación (`// Un Evento pertenece a un Usuario (el organizador que lo creó)`).
*   **Integraciones externas:** todo código que interactúe con Telegram, Discord, Google OAuth o Resend lleva un bloque de comentarios que explica el flujo completo.
*   **Middlewares de seguridad:** explicar qué ataque previene cada middleware y cómo lo hace.

## 5. Integración de Features sin Conflictos

El proyecto usa un esquema modular para trabajar en paralelo sin editar archivos compartidos centralizados.

### 5.1 Agregar un modelo (Backend)

1.  Crear el archivo en `models/` con la extensión `.model.js` (ej. `models/categoria.model.js`). El cargador dinámico de `models/index.js` lo importa automáticamente.
2.  Declarar las relaciones dentro del método estático `associate` del mismo archivo:
    ```javascript
    static associate(models) {
      this.belongsTo(models.Usuario, { foreignKey: 'organizadorId', as: 'organizador' });
    }
    ```

### 5.2 Agregar una ruta (Backend)

1.  Crear el archivo en `routes/` con la extensión `.routes.js` (ej. `routes/evento.routes.js`). El cargador dinámico de `routes/index.js` lo monta automáticamente.
2.  Si la ruta sigue el nombre plural convencional (ej. `/api/eventos`), exportar directamente el router:
    ```javascript
    // routes/evento.routes.js
    module.exports = router;
    ```
3.  Si se necesita un prefijo explícito (ej. `/api/auth` en vez de `/api/auths`), exportar un objeto con `prefix` y `router`:
    ```javascript
    // routes/auth.routes.js
    module.exports = { prefix: '/auth', router };
    ```

### 5.3 Agregar rutas en el Frontend (Angular)

1.  Crear un archivo de rutas propio dentro de la carpeta del feature (ej. `src/app/features/auth/auth.routes.ts`) y exportar el array de rutas:
    ```typescript
    import { Routes } from '@angular/router';
    export const authRoutes: Routes = [
      { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) }
    ];
    ```
2.  En `app.routes.ts`, importar esas rutas con `loadChildren` en el layout correspondiente (única línea a tocar):
    ```typescript
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
      }
    ]
    ```

## 6. Linter y formato

*   El backend usa ESLint (configuración en `eslint.config.js`). Correr `npm run lint` antes de subir cambios; el código no debe tener errores de linter.
*   Al hacer un commit, `husky` y `lint-staged` ejecutan ESLint automáticamente sobre los archivos modificados. Si el linter falla, el commit se cancela: hay que corregir y volver a intentar.
*   La integración continua (GitHub Actions) también corre la instalación limpia y el linter en cada Pull Request. Un PR con el linter en rojo no se integra.
