# Flujo de Trabajo y Colaboración (Equipo G02 — 5 integrantes)

Este documento define **cómo colaboramos** como equipo real: ramas, commits, Pull Requests, revisiones y comunicación. Es de lectura obligatoria para todos los integrantes y para cualquier agente IA que vaya a contribuir.

> **Filosofía:** Trabajamos como un equipo profesional. No improvisamos en `main`. Cada cambio entra por una rama, por un PR, con revisión. Esta materia es una oportunidad para experimentar un flujo Git real — aprovéchenlo.

---

## 1. Estructura de Repositorios
La consigna exige **dos repositorios Git independientes**.

*   **Backend:** https://github.com/MauroNanda/proybackendgrupo02
*   **Frontend:** https://github.com/MauroNanda/proyfrontendgrupo02

Cada repo tiene su propio `package.json`, `.gitignore` y estructura. La carpeta `docs/` (fuente única de verdad) vive en el repo del backend.

**Las reglas de este documento aplican a ambos repos por igual.**

---

## 2. Fase Inicial: El Proyecto Base
Antes de programar funcionalidades aisladas, se construye un **Proyecto Base (Scaffolding)** en cada repo.

*   **Backend:** Conexión a Neon.tech, configuración de Sequelize, middlewares base (CORS, JWT, error handler), estructura MVC de carpetas, al menos una migración de ejemplo.
*   **Frontend:** Proyecto Angular 22 inicializado, Bootstrap 5 instalado, layouts (`public-layout`, `admin-layout`) creados, ruteo base configurado, servicios base de HTTP.

**Regla:** nadie crea una `feature/*` hasta que el Proyecto Base esté mergeado en `main` en ambos repos.

---

## 3. Estrategia de Ramas

### 3.1 Ramas Permanentes
| Rama | Propósito | Quién pushea |
|---|---|---|
| `main` | Rama principal de integración. Recibe todo el código nuevo del equipo. | **Nadie pushea directo.** Solo recibe merges desde feature branches vía Pull Request. |

> **Nota:** el proyecto trabaja directamente sobre `main` (no usamos `develop`). Toda rama de trabajo sale de `main` actualizado y vuelve a `main` por PR.

### 3.2 Ramas de Trabajo (temporales)
Se crean **siempre desde `main` actualizado**.

| Prefijo | Para qué | Ejemplo |
|---|---|---|
| `feature/*` | Una nueva funcionalidad. | `feature/crud-eventos`, `feature/integracion-telegram` |
| `fix/*` | Arreglar un bug. | `fix/validacion-fecha-evento` |
| `docs/*` | Cambios solo a documentación. | `docs/actualizar-arquitectura` |
| `chore/*` | Tareas de mantenimiento, dependencias, config. | `chore/actualizar-sequelize` |

### 3.3 Reglas de Nomenclatura
*   Todo en `kebab-case`.
*   Una rama = una tarea. **Una rama NO puede contener dos features no relacionadas.**
*   El nombre debe ser claro y corto. **NO** uses `feature/mi-rama`, `feature/test`, `feature/cambios`.
*   Si la tarea está en el `PLAN-DE-TAREAS.md`, el nombre de la rama lo dicta ese documento.

### 3.4 Cómo Crear una Rama
```bash
# 1. Posicionarse en main y traer lo último
git checkout main
git pull origin main

# 2. Crear la rama
git checkout -b feature/nombre-descriptivo

# 3. Trabajar, commitear, pushear
git push -u origin feature/nombre-descriptivo
```

---

## 4. Convenciones de Commits

Usamos una variante simplificada de **Conventional Commits** en español.

### 4.1 Formato
```
<tipo>: <descripción corta en imperativo, en español, sin punto final>

[cuerpo opcional explicando el porqué]
```

### 4.2 Tipos
| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad visible para el usuario. |
| `fix` | Arregla un bug. |
| `docs` | Solo cambios de documentación. |
| `style` | Cambios de formato/estilo que no afectan lógica (espacios, comas, indentación). |
| `refactor` | Reescribir código sin cambiar comportamiento ni agregar features. |
| `test` | Agregar o modificar tests. |
| `chore` | Cambios de configuración, dependencias, scripts. |

### 4.3 Ejemplos Buenos
```
feat: agregar endpoint POST /api/eventos
fix: corregir validación de fecha de fin en formulario de evento
docs: actualizar diagrama ER en ARQUITECTURA.md
refactor: extraer lógica de notificaciones a service
chore: instalar sequelize-cli como dev dependency
test: agregar tests para auth.service
```

### 4.4 Ejemplos Malos (NO hacer)
```
arregle un bug          # ¿Cuál? No dice qué tipo ni qué archivo
update                  # Sin tipo, sin contexto
WIP                     # No commitear "Work In Progress" a feature branches finales
asdasd                  # Auto-explicativo
Fix.                    # Con punto final, mayúscula y sin tipo
```

### 4.5 Cuándo Agregar Cuerpo
Si el **porqué** del cambio no es obvio del título, agregar un párrafo:
```
fix: cambiar comparación de fecha de < a <=

El check actual permitía inscripciones después del cierre cuando la
fecha coincidía exactamente con el límite. Detectado en pruebas
manuales con evento del 2026-07-15 a las 23:59.
```

### 4.6 Commits Atómicos (Regla Importante)

**Un commit = una unidad lógica de cambio.** No se vuelca todo el trabajo de un día en un solo commit gigante.

**Hacé pausa y commiteá cada vez que:**
*   Terminás un modelo de Sequelize → commit (`feat: agregar modelo Usuario`).
*   Terminás la migración correspondiente → commit (`feat: agregar migración tabla usuarios`).
*   Terminás el service del CRUD → commit (`feat: implementar UsuarioService con métodos CRUD`).
*   Terminás el controller → commit (`feat: agregar UsuarioController`).
*   Terminás las routes y las montás → commit (`feat: registrar rutas de /api/usuarios`).
*   Encontrás un bug menor mientras codeás otra cosa → commit separado (`fix: corregir typo en validación de email`).

**Por qué importa:**
*   Permite **revertir** un cambio puntual sin perder todo.
*   El **historial cuenta una historia** legible — el reviewer ve la lógica paso a paso.
*   La defensa frente al docente es más sólida cuando el `git log` muestra trabajo organizado.
*   Reduce conflictos en PRs grandes (commits pequeños = menos hunks).

**Mal ejemplo (NO hacer):**
```
feat: terminar todo el módulo de eventos    [+ 23 archivos modificados]
```

**Buen ejemplo:**
```
feat: agregar modelo Evento con relaciones
feat: agregar migración tabla eventos
feat: implementar EventoService.crear()
feat: implementar EventoService.listar() con filtros
feat: agregar EventoController
feat: registrar rutas /api/eventos
test: agregar test smoke para POST /api/eventos
```

**Regla rápida:** si el título del commit necesita "y" o "," → probablemente son dos commits.

---

## 5. Pull Requests (PRs)

### 5.1 Reglas de Oro
*   **NUNCA** hacés merge directo de tu feature branch a `main`. **Siempre** vía Pull Request.
*   **NUNCA** pusheás directo a `main`.
*   **NO te aprobás tu propio PR ni hacés tu propio merge.** Esa decisión la toma el reviewer asignado.
*   Si necesitás un cambio sobre tu PR (correcciones de revisión, ajustes), **lo hacés en la misma rama**. NO abrís un PR nuevo.

### 5.2 Cómo Abrir un PR
1.  Pushear la rama con tus cambios: `git push origin feature/mi-rama`.
2.  En GitHub, abrir un Pull Request **desde `feature/mi-rama` hacia `main`**.
3.  Título del PR: igual formato que un commit (`feat: ...`, `fix: ...`).
4.  Descripción del PR debe incluir:
    *   **Qué hace** (1-3 líneas).
    *   **Por qué** (motivación).
    *   **Cómo probarlo** (pasos para verificar).
    *   **Capturas** si hay cambios visuales (frontend).
    *   **Referencia al PLAN-DE-TAREAS** si aplica (ej. "Resuelve tarea T-04").
5.  Avisar en el canal del grupo (WhatsApp/Discord) que abriste el PR para que sea revisado.

### 5.3 Después de Pushear
*   **Pushear NO equivale a integrar.** El código está en tu rama, no en `main`.
*   Avisás al equipo y esperás revisión.
*   Si recibís comentarios, los resolvés **en la misma rama** y volvés a avisar.
*   No tocás otras ramas mientras esperás revisión. Podés arrancar otra tarea en otra rama si tenés capacidad.

### 5.4 Resolución de Conflictos
*   Si tu PR tiene conflictos con `main`, los resolvés vos en tu rama:
    ```bash
    git checkout feature/mi-rama
    git pull origin main      # trae lo último de main a tu rama
    # resolver conflictos en editor
    git add .
    git commit -m "chore: resolver conflictos con main"
    git push
    ```
*   **NUNCA** resolvás conflictos directamente en `main`.

---

## 6. Reglas Específicas del Equipo (Importante)

### 6.1 Nunca Mergear vos mismo
*   `main` solo recibe código a través de Pull Requests aprobados.
*   El merge lo realiza únicamente el reviewer asignado tras aprobar el PR. Nunca hacés merge de tu propio PR.

### 6.2 Push, No Merge
*   Tu responsabilidad termina en `git push` + abrir el PR + avisar al grupo.
*   El merge a `main` lo realiza el reviewer asignado tras aprobar el PR.

### 6.3 Cambios sobre la Misma Rama
*   Si te piden ajustar algo, **NO crees una rama nueva** ni abras otro PR.
*   Hacés los cambios en la misma rama, commiteás, pusheás. El PR se actualiza solo.

### 6.4 Una Tarea = Una Rama = Un PR
*   No mezcles dos features en un mismo PR aunque sean del mismo archivo. Si tocás otro tema, otra rama.
*   La única excepción: cambios triviales relacionados (ej. fix de typo descubierto mientras hacías el feature).

### 6.5 Antes de Empezar una Tarea
Leé en este orden:
1.  `docs/BITACORA.md` (estado actual del proyecto).
2.  `docs/PLAN-DE-TAREAS.md` (qué hacer, qué archivos crear/tocar/no tocar).
3.  `docs/CONVENCIONES.md` (cómo escribir el código).
4.  `docs/ARQUITECTURA.md` (dónde encajan los archivos que vas a crear).

### 6.6 Comunicación
*   Avisás cuando: abrís un PR, recibís revisión, encontrás un bloqueante, encontrás un bug en `main`.
*   Si vas a tocar un archivo que aparece en la lista de "archivos a tocar" de otra tarea activa, coordiná antes con el otro integrante para evitar conflictos.

---

## 7. Cuándo se Actualizan los Documentos

| Archivo | Cuándo se actualiza |
|---|---|
| `BITACORA.md` | Después de cada sesión de trabajo o decisión importante. |
| `PLAN-DE-TAREAS.md` | Cuando se asignan, completan, modifican o agregan tareas. |
| `PROPUESTA.md` / `ARQUITECTURA.md` | Solo si cambia el alcance o el diseño técnico. Requiere acuerdo del equipo. |
| `CONVENCIONES.md` / `FLUJO_DE_TRABAJO.md` | Solo si se descubre una regla nueva o cambia un acuerdo del equipo. |

> Las actualizaciones de docs también van por rama `docs/*` y PR. **No editar docs directamente en `main`.**

---

## 8. Checklist Antes de Abrir el PR
*   [ ] La rama parte de `main` actualizado.
*   [ ] El nombre de la rama sigue la convención (`feature/`, `fix/`, etc.).
*   [ ] Los commits siguen Conventional Commits en español.
*   [ ] Mis cambios respetan las convenciones de `CONVENCIONES.md`.
*   [ ] Toqué solo los archivos listados en mi tarea de `PLAN-DE-TAREAS.md` (o coordiné si tuve que tocar otros).
*   [ ] El código compila / arranca sin errores localmente.
*   [ ] La descripción del PR explica qué, por qué y cómo probar.
*   [ ] Avisé al grupo que abrí el PR.
