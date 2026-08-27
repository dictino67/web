const form = document.querySelector('#invoice-form');
const imageInput = document.querySelector('#document');
const fileName = document.querySelector('#file-name');
const message = document.querySelector('#form-message');

imageInput.addEventListener('change', () => {
  fileName.textContent = imageInput.files[0]?.name || 'Aucun fichier sélectionné';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  const submitButton = form.querySelector('button[type="submit"]');
  const file = imageInput.files[0];
  if (!file || !['image/jpeg', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    message.textContent = 'Choisissez un fichier JPEG ou PDF de 5 Mo maximum.';
    message.classList.add('error');
    return;
  }
  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = 'Enregistrement...';

  try {
    const response = await fetch('/api/invoices', { method: 'POST', body: new FormData(form) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Une erreur est survenue.');
    message.textContent = result.message;
    message.classList.add('success');
    form.reset();
    fileName.textContent = 'Aucun fichier sélectionné';
  } catch (error) {
    message.textContent = error.message;
    message.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = 'Enregistrer la facture';
  }
});
