# Integraciones — cómo sumar una sin romper el flujo

Esta carpeta concentra las integraciones externas. El objetivo del diseño es que
puedas agregar la tuya **creando un archivo** y tocando **una sola línea**, sin
meter mano en los servicios de negocio (`inscripcion.service.js`, `evento.service.js`).

## 1. Notificaciones a usuarios (Telegram, Web Push, etc.)

Todo pasa por el hub `notificaciones.js`. Un "canal" es un objeto con un `nombre`
y los métodos que quiera implementar. El hub llama a cada canal y aísla los errores
(si tu canal falla, los demás siguen funcionando).

Métodos disponibles (implementá los que apliquen):

| Método | Cuándo se dispara |
|---|---|
| `inscripcionConfirmada(usuario, evento)` | El usuario quedó CONFIRMADO |
| `inscripcionEnEspera(usuario, evento)` | El cupo estaba lleno → lista de espera |
| `cupoLiberado(usuario, evento)` | Se liberó un cupo y lo promovieron |

### Pasos
1. Crear `channels/<lo-tuyo>.channel.js`:
   ```js
   module.exports = {
     nombre: 'telegram',
     async inscripcionConfirmada(usuario, evento) {
       if (!usuario.telegram_id) return;
       // ... enviar mensaje por Telegram ...
     },
   };
   ```
2. Registrarlo en `notificaciones.js`, agregándolo al array `canales`
   (o `notificaciones.registrarCanal(miCanal)`).

Listo. No hace falta tocar `inscripcion.service.js`.

## 2. Reaccionar a eventos publicados (Discord)

Usá `eventos.hooks.js`. `evento.service` dispara `alPublicarEvento(evento)` cuando
un evento pasa a `PUBLICADO`. Vos solo registrás un handler:

```js
const eventosHooks = require('./eventos.hooks');
eventosHooks.onPublicado(async (evento) => {
  // ... publicar el evento en el canal de Discord ...
});
```

Registrá el handler una vez al arrancar la app (por ejemplo desde el archivo de
arranque del bot que crees). Los errores del handler quedan aislados.

## Variables de entorno
Cada integración agrega sus claves en `.env` y las documenta en `.env.example`
(ej. `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, claves VAPID, etc.).
