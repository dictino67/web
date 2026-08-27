const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector('button');
  submitButton.disabled = true;
  loginMessage.textContent = '';
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(Object.fromEntries(new FormData(loginForm)))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Connexion refusée.');
    window.location.replace('index.html');
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.className = 'form-message error';
    submitButton.disabled = false;
  }
});
