const isLoginPage = window.location.pathname.endsWith('/login.html');

(async () => {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const authenticated = response.ok;
    if (isLoginPage && authenticated) window.location.replace('index.html');
    if (!isLoginPage && !authenticated) window.location.replace('login.html');
  } catch {
    if (!isLoginPage) window.location.replace('login.html');
  }
})();
