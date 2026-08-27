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
  [detail.description, detail.quantite, `${detail.montant} €`].forEach((value) => {
    const cell = document.createElement('span');
    cell.textContent = value;
    row.append(cell);
  });
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
