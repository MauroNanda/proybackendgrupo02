const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
let resend = null;

if (apiKey) {
  resend = new Resend(apiKey);
} else {
  console.warn('⚠️  [EmailService] RESEND_API_KEY no configurado en .env. Envío de correos desactivado (se simulará por consola).');
}

const enviarEmail = async (destinatario, asunto, htmlContent) => {
  if (resend) {
    return await resend.emails.send({
      from: 'Convoca <onboarding@resend.dev>',
      to: [destinatario],
      subject: asunto,
      html: htmlContent,
    });
  } else {
    // Sin Resend configurado se simula el envío por consola. Se loguea también
    // el cuerpo para poder leer en desarrollo datos como el código 2FA (que solo
    // viaja por email); sin esto, el login con 2FA no se podría completar en dev.
    console.log(`✉️  [Simulado] Enviando correo a: ${destinatario}`);
    console.log(`   Asunto: ${asunto}`);
    console.log(`   Cuerpo: ${htmlContent}`);
    return { id: 'mock-email-id-' + Date.now() };
  }
};

module.exports = { enviarEmail };