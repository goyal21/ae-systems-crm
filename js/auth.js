// ═══════════════════════════════════════════════
//  AE SYSTEMS CRM — AUTH MODULE
// ═══════════════════════════════════════════════

const Auth = (() => {
  let currentUser = null;

  function init() {
    // Restore session from sessionStorage
    const saved = sessionStorage.getItem('ae_crm_user');
    if (saved) {
      try { currentUser = JSON.parse(saved); } catch(e) {}
    }
  }

  function handleCredentialResponse(response) {
    try {
      const payload = parseJwt(response.credential);
      const email = payload.email?.toLowerCase();

      const allowed = AE_CONFIG.ALLOWED_USERS.map(e => e.toLowerCase());
      if (!allowed.includes(email)) {
        showLoginError(`Access denied. ${email} is not authorised to use this app.`);
        return;
      }

      const founder = AE_CONFIG.FOUNDERS.find(f => f.email.toLowerCase() === email);
      currentUser = {
        name:    payload.name || founder?.name || email,
        email:   email,
        picture: payload.picture || '',
        initials: getInitials(payload.name || founder?.name || email),
      };

      sessionStorage.setItem('ae_crm_user', JSON.stringify(currentUser));
      App.onLogin();
    } catch(e) {
      showLoginError('Login failed. Please try again.');
    }
  }

  function signOut() {
    currentUser = null;
    sessionStorage.removeItem('ae_crm_user');
    if (window.google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
    App.onLogout();
  }

  function getUser() { return currentUser; }
  function isLoggedIn() { return !!currentUser; }

  function showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function parseJwt(token) {
    const base64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }

  return { init, handleCredentialResponse, signOut, getUser, isLoggedIn };
})();

// Expose for Google GSI callback
function handleCredentialResponse(response) {
  Auth.handleCredentialResponse(response);
}
