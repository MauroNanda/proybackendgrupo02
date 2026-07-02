const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const enviarEmail = async (destinatario, asunto, htmlContent) => {
    return await resend.emails.send({
        from: 'Convoca <onboarding@resend.dev>',
        to: [destinatario],
        subject: asunto,
        html: htmlContent,
    });
};

module.exports = { enviarEmail };