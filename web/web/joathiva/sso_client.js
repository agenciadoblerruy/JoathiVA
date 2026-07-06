/**
 * JoathiVA — SSO Client (unificado)
 * ---------------------------------
 * Mecanismo dual de sesión:
 *   1) localStorage['jva_session']  (fuente principal, mismo dominio)
 *   2) ?sso=<token> en la URL        (respaldo al redirigir entre portales)
 *
 * Endpoint de validación: verify_token.php (el que usa auth_unified).
 * Storage key único: 'jva_session' (el que ya guarda joathiva.html).
 */
(function () {
  'use strict';

  function apiBase() {
    if (window.JVA_API_BASE) return window.JVA_API_BASE;
    const h = location.hostname;
    if (location.protocol === 'file:') return 'http://localhost/joathiva/api';
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return location.origin + '/joathiva/api';
    return location.origin + '/joathiva/api';
  }

  const SESSION_KEY = 'jva_session';

  // Mapa rol → portal. Portales grandes de raíz cuando existen (apps reales);
  // resto en sub-carpetas. Rutas relativas a /joathiva/.
  const PORTAL_MAP = {
    admin:        './admin.html',
    administrador:'./administracion.html',
    sistemas:     './admin.html',
    operario:     './departamentos/operaciones.html',
    operador:     './departamentos/operaciones.html',
    operaciones:  './departamentos/operaciones.html',
    facturacion:  './facturacion.html',
    'facturación':'./facturacion.html',
    comercial:    './comercial.html',
    chofer:       './chofer.html',
    cliente:      './cliente.html',
    proveedor:    './perfiles/proveedor.html',
    despachante:  './perfiles/despachante.html',
  };

  function portalForRole(role) {
    const r = String(role || '').toLowerCase().trim();
    return PORTAL_MAP[r] || null;
  }

  // Usuarios que ven la pantalla de tarjetas multi-portal.
  // Acepta username corto o el email completo del login por correo.
  function isMultiPortalUser(sess) {
    const u = String((sess && (sess.username || sess.user)) || '').toLowerCase().trim();
    const multi = [
      'rhernandez', 'rhernandez@joathilogistica.com',
      'gimena',     'gimena@joathilogistica.com',
      'valeria',    'valeria@joathilogistica.com',
      'sistemas',   'sistemas@joathilogistica.com',
    ];
    return multi.indexOf(u) >= 0;
  }

  function saveSession(data) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !s.token) return null;
      if (s.expires_at) {
        const exp = new Date(String(s.expires_at).replace(' ', 'T')).getTime();
        if (!Number.isNaN(exp) && exp < Date.now()) { clearSession(); return null; }
      }
      return s;
    } catch (e) { return null; }
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  function authHeaders() {
    const s = getSession();
    return s && s.token ? { Authorization: 'Bearer ' + s.token } : {};
  }

  function tokenFromURL() {
    try { return new URLSearchParams(location.search).get('sso') || null; }
    catch (e) { return null; }
  }
  function stripTokenFromURL() {
    try { window.history.replaceState({}, document.title, location.pathname + location.hash); }
    catch (e) {}
  }

  async function validateToken(token) {
    try {
      const res = await fetch(apiBase() + '/verify_token.php', {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (!data || data.ok === false) return null;
      const sess = data.session || data;
      if (!sess.token) sess.token = token;
      return sess;
    } catch (e) { return null; }
  }

  async function resolveSession() {
    const local = getSession();
    if (local) return local;
    const urlTok = tokenFromURL();
    if (urlTok) {
      const sess = await validateToken(urlTok);
      if (sess) { saveSession(sess); stripTokenFromURL(); return sess; }
    }
    return null;
  }

  async function requireSession(opts) {
    opts = opts || {};
    const sess = await resolveSession();
    if (sess) { if (typeof opts.onReady === 'function') opts.onReady(sess); return sess; }
    if (typeof opts.onLogin === 'function') opts.onLogin();
    return null;
  }

  function gotoPortal(role, username) {
    const path = portalForRole(role);
    if (!path) { console.warn('[JVASSO] Rol sin portal:', role); return false; }
    const s = getSession();
    const tok = s && s.token ? s.token : '';
    const sep = path.indexOf('?') >= 0 ? '&' : '?';
    location.href = tok ? (path + sep + 'sso=' + encodeURIComponent(tok)) : path;
    return true;
  }

  window.JVASSO = {
    apiBase, getSession, resolveSession, requireSession,
    saveSession, clearSession, authHeaders,
    gotoPortal, portalForRole, isMultiPortalUser, SESSION_KEY,
  };
})();
