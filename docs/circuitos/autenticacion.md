# Circuito: Autenticación

**Responsable principal (OAuth + 2FA, T-11):** Fio.
**Base de autenticación (registro, login, JWT, cookie, guards):** equipo.

---

## Qué hace

Permite que una persona cree su cuenta e ingrese a Convoca, ya sea con usuario y contraseña o con su cuenta de Google. Si el usuario activó la verificación en dos pasos, además de la contraseña debe ingresar un código de 6 dígitos que le llega por email. Una vez adentro, la sesión se mantiene con una cookie que el navegador envía sola en cada pedido, y el sistema distingue dos roles (ORGANIZADOR y ASISTENTE) para decidir qué puede hacer cada uno.

---

## Flujo paso a paso

### (a) Registro

1. El usuario completa el formulario en `registro.component.ts` (front) y se envía `POST /api/auth/registro` con `{ nombre, username, email, password }`.
2. En el back, la ruta (`routes/auth.routes.js`) pasa primero por `registroLimiter` (máximo 5 registros por IP por hora) y por las validaciones de `express-validator` (`validacionRegistro`: email válido, password de 8+ caracteres, username de 3 a 60 caracteres alfanumérico).
3. `authController.registro` llama a `authService.registro`: verifica que el email y el username no existan (si existen responde 409), hashea la contraseña con `bcrypt.hash(password, 10)` y crea el usuario **siempre con rol `ASISTENTE`** (el campo `rol` del body se ignora a propósito).
4. El servicio genera un JWT con `_generarToken` (payload: id, email, username, rol) y el controller setea la cookie httpOnly con `setAuthCookie(res, token)`. Responde 201 con `{ token, usuario }`.
5. El front (`auth.service.ts` → `registro()`) guarda el `usuario` en `localStorage` y en el signal `currentUser`. El token no se guarda: quedó en la cookie que el JS no puede leer.

### (b) Login normal (usuario/email + contraseña)

1. El usuario completa `login.component.ts` y se envía `POST /api/auth/login` con `{ username, password }` (el campo `username` acepta también el email).
2. La ruta pasa por `loginLimiter` (10 intentos por IP cada 15 minutos) y `validacionLogin`.
3. `authService.login` busca al usuario por username **o** email (usa el scope `conPassword` porque el scope por defecto del modelo excluye la contraseña) y compara con `bcrypt.compare`. Si no coincide: 401 "Credenciales inválidas" (mismo mensaje exista o no el usuario, para no revelar cuentas).
4. Bifurcación:
   - Si el usuario tiene `two_factor_enabled`: **no se emite token**. Se llama a `_iniciarFlujo2FA` y se responde `{ requiere2FA: true, email }` (sigue en el flujo (d)).
   - Si no tiene 2FA: se genera el JWT, `setAuthCookie` deja la cookie httpOnly y se responde `{ token, usuario }`.
5. El front: si la respuesta trae `requiere2FA`, guarda el email en `sessionStorage` (`login_email`) y navega a `/auth/2fa`. Si trae `usuario`, guarda sesión y redirige según rol con `redirigirPostAuth` (ORGANIZADOR → `/admin`, resto → `/`).

### (c) Login con Google (OAuth 2.0)

1. El botón "Iniciar sesión con Google" (`login.component.ts` → `iniciarGoogle()`) redirige el navegador completo a `GET /api/auth/google` (no es un fetch: es navegación).
2. `authController.redirigirGoogle` genera un `state` aleatorio (`crypto.randomBytes`), lo guarda en una cookie httpOnly `oauth_state` (dura 10 minutos) y redirige a la pantalla de consentimiento de Google con `client_id`, `redirect_uri`, `scope=email profile` y el `state`.
3. El usuario acepta en Google, y Google redirige a `GET /api/auth/google/callback?code=...&state=...`.
4. `authController.callbackGoogle`:
   - Compara el `state` de la URL con la cookie `oauth_state` (protección CSRF). Si no coinciden, redirige al front con `#error=state`.
   - Canjea el `code` por tokens con `client.getToken(...)` y verifica el `id_token` con `client.verifyIdToken` (librería oficial `google-auth-library`).
   - Llama a `authService.loginGoogle` con los datos del perfil de Google: busca por `google_id`; si no existe pero hay un usuario con ese email, **vincula** el `google_id` a esa cuenta (evita duplicados); si no existe nada, crea la cuenta con rol `ASISTENTE` y sin contraseña.
5. Si la cuenta tiene 2FA activado, redirige a `{FRONTEND_URL}/auth/2fa#email=...` sin emitir token (no se puede saltear el segundo factor entrando por Google). Si no, setea la cookie httpOnly con `setAuthCookie` y redirige a `{FRONTEND_URL}/auth/callback`.
6. En el front, `oauth-callback.component.ts` no recibe el token (ya viajó en la cookie): simplemente llama a `cargarPerfil()` (`GET /api/auth/perfil`, autenticado por cookie) para saber quién es el usuario, puebla `currentUser` y redirige según rol.

### (d) Verificación en dos pasos (2FA)

1. Cuando el login (normal o Google) detecta `two_factor_enabled`, `authService._iniciarFlujo2FA` genera un código de 6 dígitos con `crypto.randomInt(100000, 1000000)` (criptográficamente seguro), lo guarda **hasheado con bcrypt** en `codigo_2fa` con vencimiento a 10 minutos (`codigo_2fa_expira`) y lo envía por email con `enviarEmail` (Resend).
2. El front navega a `/auth/2fa` (`2fa.component.ts`), que recupera el email desde `sessionStorage` (flujo login) o del fragment `#email=` (flujo Google), y el usuario tipea el código.
3. Se envía `POST /api/auth/2fa/verify` con `{ email, codigo }`. La ruta pasa por `codigo2faLimiter` (5 intentos por IP cada 15 minutos).
4. `authService.validarCodigo2FA`: verifica que exista un flujo 2FA activo, que no esté vencido (si venció, limpia los campos), y compara el código con `bcrypt.compare`. Si es válido, **limpia `codigo_2fa` y `codigo_2fa_expira` (un solo uso)**, genera el JWT y el controller setea la cookie con `setAuthCookie`.
5. El front guarda la sesión, borra `login_email` de `sessionStorage` y redirige según rol.
6. Activar/desactivar el 2FA se hace desde el perfil (`perfil.component.ts` → `configurar2FA`) contra `POST /api/auth/2fa/config`, ruta protegida con `authMiddleware` que llama a `authService.cambiarEstado2FA`.

### (e) Cómo se protege una ruta (sesión, roles)

1. Tras el login, el navegador tiene la cookie `convoca_token` (httpOnly). En el front, `credentials.interceptor.ts` clona cada request a la API con `withCredentials: true`, así el navegador adjunta esa cookie automáticamente.
2. En el back, cualquier ruta protegida usa `authMiddleware` (`middlewares/auth.middleware.js`): lee el token de la cookie con `leerCookie(req, COOKIE_NAME)` (o del header `Authorization: Bearer`, mantenido como legado para Postman), lo verifica con `verificarToken` (firma + expiración) y adjunta el payload en `req.usuario`. Sin token o token inválido → 401.
3. Si la ruta exige un rol, se encadena `roleMiddleware(['ORGANIZADOR'])` (`middlewares/role.middleware.js`) después de `authMiddleware`: si `req.usuario.rol` no está en la lista, responde 403.
4. En el front los guards de router hacen la protección de UX (no de seguridad): `authGuard` redirige a `/login?returnUrl=...` si no hay sesión, `roleGuard` manda al home si no es ORGANIZADOR, y `guestGuard` impide ver login/registro con sesión activa. La seguridad real siempre está en el backend.
5. Logout: `POST /api/auth/logout` llama a `clearAuthCookie(res)`; el front no puede borrar la cookie por sí mismo (es httpOnly), por eso se lo pide al backend y además limpia `localStorage` y el signal.

---

## Archivos involucrados

### Backend

| Archivo | Rol |
|---|---|
| `routes/auth.routes.js` | Define los endpoints (`/registro`, `/login`, `/perfil`, `/logout`, `/google`, `/google/callback`, `/2fa/verify`, `/2fa/config`) con sus validaciones y rate limiters. |
| `controllers/auth.controller.js` | Recibe request/response: setea/borra cookies, maneja el flujo OAuth (state, redirects) y delega la lógica al servicio. |
| `services/auth.service.js` | Lógica de negocio: hash de contraseñas, validación de credenciales, vinculación de cuenta Google, generación y validación del código 2FA, emisión del JWT. |
| `middlewares/auth.middleware.js` | Lee el JWT de la cookie (o header Bearer legado), lo verifica y deja `req.usuario` disponible. |
| `middlewares/role.middleware.js` | Restringe rutas por rol (`roleMiddleware(['ORGANIZADOR'])`), después de `authMiddleware`. |
| `middlewares/rate-limit.middleware.js` | Limitadores anti fuerza bruta: `loginLimiter`, `registroLimiter`, `codigo2faLimiter`. |
| `utils/jwt.util.js` | `firmarToken` y `verificarToken` con `JWT_SECRET` y expiración de 24h. |
| `utils/cookie.util.js` | `setAuthCookie` / `clearAuthCookie` / `leerCookie`: cookie httpOnly `convoca_token` con sameSite lax y vida igual a la del JWT. |
| `models/usuario.model.js` | Modelo `Usuario`: password hasheada (excluida por defaultScope), `rol` (ENUM), `google_id`, `two_factor_enabled`, `codigo_2fa`, `codigo_2fa_expira`. |
| `integrations/channels/email.channel.js` | Canal de email (Resend) sobre `enviarEmail`, la misma función que usa el servicio para mandar el código 2FA. |

### Frontend

| Archivo | Rol |
|---|---|
| `src/app/core/services/auth.service.ts` | Estado de sesión con signals (`currentUser`, `isLoggedIn`, `isAdmin`) y llamadas HTTP de auth; nunca guarda el token. |
| `src/app/core/interceptors/credentials.interceptor.ts` | Agrega `withCredentials: true` a los requests a la API para que viaje la cookie. |
| `src/app/core/guards/auth.guard.ts` | Bloquea rutas si no hay sesión y redirige a `/login` con `returnUrl`. |
| `src/app/core/guards/role.guard.ts` | Solo deja pasar a ORGANIZADOR (zona `/admin`). |
| `src/app/core/guards/guest.guard.ts` | Impide entrar a login/registro si ya hay sesión. |
| `src/app/features/auth/login/login.component.ts` | Formulario reactivo de login; deriva a 2FA si corresponde; botón de Google. |
| `src/app/features/auth/registro/registro.component.ts` | Formulario reactivo de registro. |
| `src/app/features/auth/callback/oauth-callback.component.ts` | Aterrizaje del redirect de Google: pide `/perfil` (la cookie ya está) y puebla la sesión. |
| `src/app/features/auth/2fa/2fa.component.ts` | Formulario del código de 6 dígitos; toma el email de `sessionStorage` o del fragment. |
| `src/app/features/user/perfil/perfil.component.ts` | Edición de nombre y switch para habilitar/deshabilitar 2FA. |

---

## Puntos clave para la defensa

- **¿Por qué cookie httpOnly y no localStorage?** Un token en localStorage lo puede leer cualquier script (si hay XSS, el atacante se lo lleva). La cookie httpOnly no es accesible desde JavaScript: el navegador la manda solo. Ver `utils/cookie.util.js` (`setAuthCookie`, flag `httpOnly: true`) y el comentario en `auth.service.ts` del front (ya no existe signal `token`).

- **¿Cómo se evita fuerza bruta en el 2FA?** Tres capas: el código expira a los 10 minutos, es de un solo uso (se limpia al validar) y el endpoint tiene `codigo2faLimiter` (5 intentos por IP cada 15 minutos). Ver `authService.validarCodigo2FA` y `middlewares/rate-limit.middleware.js`.

- **¿Por qué el registro siempre crea rol ASISTENTE?** Si el rol se tomara del body, cualquiera podría registrarse como `{ rol: 'ORGANIZADOR' }` y escalar privilegios. El servicio lo fija en duro: `rol: 'ASISTENTE'` en `authService.registro`. La promoción a ORGANIZADOR va por un endpoint protegido para admins.

- **¿Dónde se valida el token?** En `middlewares/auth.middleware.js` (función `authMiddleware`): lee la cookie `convoca_token` con `leerCookie`, verifica firma y expiración con `verificarToken` (`utils/jwt.util.js`, `jwt.verify` con `JWT_SECRET`) y deja los datos en `req.usuario`. Los guards de Angular solo mejoran la experiencia: la validación de verdad es esta.

- **¿Qué es el `state` en OAuth?** Un valor aleatorio anti-CSRF: se genera en `redirigirGoogle`, se guarda en la cookie httpOnly `oauth_state` y se compara en `callbackGoogle`. Impide que un atacante fabrique un callback y le "inyecte" una sesión ajena a la víctima. Ver `controllers/auth.controller.js`.

- **¿Por qué la contraseña no vuelve nunca en las respuestas?** El modelo tiene un `defaultScope` que excluye `password`; el login usa explícitamente el scope `conPassword` solo para comparar el hash. Ver `models/usuario.model.js`.

- **¿Cómo conviven cuenta con contraseña y cuenta Google?** Por email: si alguien entra con Google y ya existía una cuenta con ese email, se le vincula el `google_id` en vez de crear un duplicado (el email es único en la BD). Ver `authService.loginGoogle`.

- **¿Por qué el logout es un endpoint y no solo limpiar el front?** Porque la cookie es httpOnly y el JS no puede borrarla: solo el backend puede con `clearAuthCookie`. Ver `authController.logout` y `logout()` en el `auth.service.ts` del front.

- **¿Por qué el código 2FA se guarda hasheado?** Si alguien accede a la BD (o a un backup), no puede leer los códigos vigentes. Se compara con `bcrypt.compare`, igual que una contraseña. Ver `_iniciarFlujo2FA` y `validarCodigo2FA` en `services/auth.service.js`.

---

## Bloques de código clave

**1. La cookie de sesión (`utils/cookie.util.js`)** — httpOnly bloquea la lectura por JS (XSS no roba el token); la vida de la cookie se calcula desde la expiración del JWT para que mueran juntas.

```js
const opcionesBase = {
  httpOnly: true,     // el JS del front NO puede leerla → XSS no roba el token
  sameSite: 'lax',    // localhost:4200 ↔ :3000 es same-site (el puerto no cuenta)
  secure: isProd,     // solo HTTPS en producción
  path: '/api',       // la cookie solo viaja hacia la API
};

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...opcionesBase, maxAge: expiresInMs(JWT_EXPIRES_IN) });
}
```

**2. El middleware que lee la cookie y valida el JWT (`middlewares/auth.middleware.js`)** — es el punto único donde se decide si un request está autenticado; deja el payload en `req.usuario` para que controllers y `roleMiddleware` lo usen.

```js
function authMiddleware(req, _res, next) {
  let token = leerCookie(req, COOKIE_NAME);          // fuente principal: cookie httpOnly
  if (!token) {
    const authHeader = req.headers.authorization;    // legado: Bearer (Postman)
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
  }
  if (!token) return next(new HttpError('Token de autenticación requerido', 401));
  try {
    const payload = verificarToken(token);           // verifica firma y expiración
    req.usuario = { id: payload.id, email: payload.email, rol: payload.rol };
    next();
  } catch {
    next(new HttpError('Token inválido o expirado', 401));
  }
}
```

**3. Validación del código 2FA (`services/auth.service.js`, `validarCodigo2FA`)** — chequea expiración antes de comparar, compara contra el hash (nunca texto plano) y lo invalida tras el primer uso.

```js
if (usuario.codigo_2fa_expira < new Date()) {        // vencido → se limpia y falla
  usuario.codigo_2fa = null;
  usuario.codigo_2fa_expira = null;
  await usuario.save();
  throw new HttpError('Código inválido o expirado', 401);
}
const codigoValido = await bcrypt.compare(codigo, usuario.codigo_2fa); // hash, no texto plano
if (!codigoValido) throw new HttpError('Código inválido o expirado', 401);

usuario.codigo_2fa = null;                           // un solo uso
usuario.codigo_2fa_expira = null;
await usuario.save();
```

**4. `state` anti-CSRF en OAuth (`controllers/auth.controller.js`)** — el valor aleatorio se emite antes de ir a Google y se exige de vuelta en el callback; si no coincide, el flujo se corta.

```js
// Al iniciar: se genera y se guarda en una cookie httpOnly de 10 minutos
const state = crypto.randomBytes(16).toString('hex');
res.cookie('oauth_state', state, { httpOnly: true, sameSite: 'lax', ... });

// En el callback: debe coincidir con lo que emitimos nosotros
const stateCookie = leerCookie(req, 'oauth_state');
res.clearCookie('oauth_state');
if (!state || !stateCookie || state !== stateCookie) {
  return res.redirect(`${FRONTEND_URL}/auth/callback#error=state`);
}
```

**5. Rol fijo en el registro (`services/auth.service.js`, `registro`)** — el rol jamás sale del body del request; así nadie se registra como ORGANIZADOR.

```js
const usuario = await Usuario.create({
  nombre,
  username: username || null,
  email,
  password: passwordHash,   // bcrypt, 10 rounds
  rol: 'ASISTENTE',         // NUNCA se toma del body → sin escalada de privilegios
});
```
