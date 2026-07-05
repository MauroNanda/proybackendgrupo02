const authService = require('../services/auth.service');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

class AuthController {
  async registro(req, res, next) {
    try {
      const resultado = await authService.registro(req.body);
      res.status(201).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const resultado = await authService.login(req.body);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }

  async perfil(req, res, next) {
    try {
      const usuario = await authService.obtenerPerfil(req.usuario.id);
      res.json(usuario);
    } catch (err) {
      next(err);
    }
  }

  // Redirige al usuario al consentimiento de Google
  async redirigirGoogle(req, res) {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&response_type=code&scope=email profile`;
    res.redirect(url);
  }

  // Recibe el código, verifica con Google y llama al servicio
  async callbackGoogle(req, res, next) {
    try {
      const { code } = req.query;
      const { tokens } = await client.getToken({
        code,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL
      });
      
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      const resultado = await authService.loginGoogle({
        id: payload.sub,
        email: payload.email,
        displayName: payload.name,
        picture: payload.picture
      });
      
     const frontendUrl = `http://localhost:4200/auth/callback?token=${resultado.token}`;
     res.redirect(frontendUrl);
    } catch (err) {
      next(err);
    }
  }

  // Método para verificar el código 2FA
  async verificar2FA(req, res, next) {
    try {
      const { email, codigo } = req.body;
      const resultado = await authService.validarCodigo2FA(email, codigo);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }

  async configurar2FA(req, res, next) {
    try {
      const { habilitar } = req.body; // true para activar, false para desactivar
      const resultado = await authService.cambiarEstado2FA(req.usuario.id, habilitar);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
