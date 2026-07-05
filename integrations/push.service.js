const webpush = require('web-push');

// Wrapper de la librería web-push (similar a email.service.js con Resend).
// Acá solo nos encargamos de ENVIAR el mensaje; guardar suscripciones lo hace services/push.service.js

let vapidConfigurado = false;

function asegurarVapid() {
  if (vapidConfigurado) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:convoca@unju.edu.ar';

  if (!publicKey || !privateKey) {
    console.warn('[push] Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY en .env — push deshabilitado.');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigurado = true;
  return true;
}

/**
 * Envía una notificación push a una suscripción del navegador.
 * @param {object} subscription - { endpoint, keys: { p256dh, auth } }
 * @param {object} payload - { title, body, url? }
 */
async function enviarPush(subscription, payload) {
  if (!asegurarVapid()) return;

  const cuerpo = JSON.stringify({
    title: payload.title || 'Convoca',
    body: payload.body || '',
    url: payload.url || '/',
  });

  await webpush.sendNotification(subscription, cuerpo);
}

function obtenerClavePublica() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

module.exports = {
  enviarPush,
  obtenerClavePublica,
};
