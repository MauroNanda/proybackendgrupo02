const crypto = require('crypto');
const { URLSearchParams } = require('url');
const authService = require('../services/auth.service');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Lee una cookie puntual del header (evita sumar cookie-parser solo para esto).
function leerCookie(req, nombre) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const par = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

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
    // `state` anti-CSRF: se guarda en una cookie httpOnly y se valida en el
    // callback, para que un tercero no pueda forzar el flujo OAuth.
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'email profile',
      state,
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  // Recibe el código, verifica con Google y llama al servicio
  async callbackGoogle(req, res, next) {
    try {
      const { code, state } = req.query;

      // Validación del state (CSRF): debe coincidir con la cookie que emitimos.
      const stateCookie = leerCookie(req, 'oauth_state');
      res.clearCookie('oauth_state');
      if (!state || !stateCookie || state !== stateCookie) {
        return res.redirect(`${FRONTEND_URL}/auth/callback#error=state`);
      }
      if (!code) {
        return res.redirect(`${FRONTEND_URL}/auth/callback#error=nocode`);
      }

      const { tokens } = await client.getToken({
        code,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      });

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const resultado = await authService.loginGoogle({
        id: payload.sub,
        email: payload.email,
        displayName: payload.name,
        picture: payload.picture,
      });

      // Si la cuenta tiene 2FA, no emitimos token: mandamos al front al paso
      // del segundo factor con el email (para que no se pueda saltear el 2FA).
      if (resultado.requiere2FA) {
        return res.redirect(
          `${FRONTEND_URL}/auth/2fa#email=${encodeURIComponent(resultado.email)}`
        );
      }

      // Token en el fragment (#), no en la query (?): el fragment no viaja al
      // servidor, así que no queda en logs de acceso ni en el header Referer.
      res.redirect(`${FRONTEND_URL}/auth/callback#token=${resultado.token}`);
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
