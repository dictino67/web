const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const authenticated = authenticate(formData.get('username'), formData.get('password'));

  loginMessage.textContent = authenticated ? '' : 'Identifiant ou mot de passe incorrect.';
  loginMessage.className = authenticated ? 'form-message' : 'form-message error';
  if (authenticated) window.location.replace('index.html');
});
