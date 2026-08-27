const invoiceId = new URLSearchParams(window.location.search).get('id');
const form = document.querySelector('#detail-form');
const editButton = document.querySelector('#edit-button');
const saveButton = document.querySelector('#save-button');
const message = document.querySelector('#detail-message');
const detailsList = document.querySelector('#detail-list');
const detailsEmpty = document.querySelector('#details-empty');
const status = document.querySelector('#processing-status');
const companyInput = document.querySelector('#nom_societe');
const descriptionInput = document.querySelector('#description');
const documentInput = document.querySelector('#document');
const currentFile = document.querySelector('#current-file');
const invoicePreview = document.querySelector('#invoice-preview');

function setEditable(editable) {
  companyInput.disabled = !editable;
  descriptionInput.disabled = !editable;
  documentInput.disabled = !editable;
  saveButton.hidden = !editable;
  editButton.hidden = editable;
}

function addDetailRow(detail) {
  const row = document.createElement('div');
  row.className = 'detail-row';
  const fields = [
    { name: 'nom_fichier', value: detail.nom_fichier, type: 'text' },
    { name: 'description', value: detail.description, type: 'text' },
    { name: 'quantite', value: detail.quantite, type: 'number' },
    { name: 'montant', value: detail.montant, type: 'number' }
  ];
  const editButton = document.createElement('button');
  editButton.className = 'button button-secondary detail-edit-button';
  editButton.type = 'button';
  editButton.textContent = 'Modifier';
  const saveButton = document.createElement('button');
  saveButton.className = 'button button-primary detail-save-button';
  saveButton.type = 'button';
  saveButton.textContent = 'Enregistrer';
  saveButton.hidden = true;
  const deleteButton = document.createElement('button');
  deleteButton.className = 'button button-danger detail-delete-button';
  deleteButton.type = 'button';
  deleteButton.textContent = 'Effacer';
  const message = document.createElement('span');
  message.className = 'detail-edit-message';
  message.hidden = true;
  const inputs = fields.map((field) => {
    const input = document.createElement('input');
    input.name = field.name;
    input.type = field.type;
    input.value = field.value;
    input.disabled = true;
    if (field.type === 'number') { input.min = '0'; input.step = field.name === 'montant' ? '0.01' : '0.001'; }
    input.className = 'detail-input';
    row.append(input);
    return input;
  });
  editButton.addEventListener('click', () => {
    inputs.forEach((input) => { input.disabled = false; });
    editButton.hidden = true;
    saveButton.hidden = false;
    message.hidden = true;
  });
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    try {
      const payload = Object.fromEntries(inputs.map((input) => [input.name, input.value]));
      const response = await fetch(`/api/detailfacture/${encodeURIComponent(detail.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de modifier le détail.');
      inputs.forEach((input) => { input.value = data.detail[input.name]; input.disabled = true; });
      editButton.hidden = false;
      saveButton.hidden = true;
      message.textContent = data.message;
      message.hidden = false;
      message.className = 'detail-edit-message success';
    } catch (error) {
      message.textContent = error.message;
      message.hidden = false;
      message.className = 'detail-edit-message error';
    } finally { saveButton.disabled = false; }
  });
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm('Effacer cette ligne de détail ?')) return;
    deleteButton.disabled = true;
    try {
      const response = await fetch(`/api/detailfacture/${encodeURIComponent(detail.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible d’effacer le détail.');
      row.remove();
      if (!detailsList.children.length) detailsEmpty.hidden = false;
    } catch (error) {
      message.textContent = error.message;
      message.hidden = false;
      message.className = 'detail-edit-message error';
      deleteButton.disabled = false;
    }
  });
  row.append(editButton, saveButton, deleteButton, message);
  detailsList.append(row);
}

async function loadInvoice() {
  if (!invoiceId) throw new Error('Identifiant de facture manquant.');
  const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossible de charger la facture.');
  companyInput.value = data.invoice.nom_societe;
  descriptionInput.value = data.invoice.description;
  currentFile.textContent = `Fichier actuel : ${data.invoice.fichier_nom}`;
  invoicePreview.replaceChildren();
  const fileUrl = `/api/invoices/${encodeURIComponent(data.invoice.id)}/file`;
  if (data.invoice.fichier_mime === 'image/jpeg') {
    const image = document.createElement('img');
    image.className = 'invoice-preview-image';
    image.src = fileUrl;
    image.alt = `Aperçu de ${data.invoice.fichier_nom}`;
    invoicePreview.append(image);
  } else {
    const pdfMessage = document.createElement('p');
    pdfMessage.className = 'list-message';
    pdfMessage.textContent = `Le document ${data.invoice.fichier_nom} est un PDF.`;
    const pdfLink = document.createElement('a');
    pdfLink.className = 'button button-secondary';
    pdfLink.href = fileUrl;
    pdfLink.target = '_blank';
    pdfLink.rel = 'noopener';
    pdfLink.textContent = 'Ouvrir le PDF';
    invoicePreview.append(pdfMessage, pdfLink);
  }
  status.textContent = data.invoice.n8n_traite ? 'Traité par n8n' : 'En attente de traitement n8n';
  detailsList.replaceChildren();
  data.details.forEach(addDetailRow);
  detailsEmpty.hidden = data.details.length > 0;
}

editButton.addEventListener('click', () => setEditable(true));
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, { method: 'PUT', body: new FormData(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Impossible de modifier la facture.');
    message.textContent = data.message;
    message.className = 'form-message success';
    setEditable(false);
    await loadInvoice();
  } catch (error) {
    message.textContent = error.message;
    message.className = 'form-message error';
  } finally { saveButton.disabled = false; }
});

loadInvoice().catch((error) => { message.textContent = error.message; message.className = 'form-message error'; });
