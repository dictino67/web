const sessionKey = 'stockpilot-authenticated';
const isLoginPage = window.location.pathname.endsWith('/login.html');
const isAuthenticated = sessionStorage.getItem(sessionKey) === 'true';

if (isLoginPage && isAuthenticated) {
  window.location.replace('index.html');
} else if (!isLoginPage && !isAuthenticated) {
  window.location.replace('login.html');
}

function authenticate(username, password) {
  if (username === 'admin' && password === 'admin') {
    sessionStorage.setItem(sessionKey, 'true');
    return true;
  }
  return false;
}
