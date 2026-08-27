const invoiceList = document.querySelector('#invoice-list');
const pageIndicator = document.querySelector('#page-indicator');
const previousButton = document.querySelector('#previous-button');
const nextButton = document.querySelector('#next-button');
const resultCount = document.querySelector('#record-count');
const message = document.querySelector('#list-message');

let currentPage = 1;

async function fetchInvoices(page) {
  invoiceList.classList.add('is-loading');
  message.textContent = '';
  message.className = 'list-message';
  try {
    const response = await fetch(`/api/invoices?page=${encodeURIComponent(page)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Impossible de charger les factures.');
    currentPage = data.page;
    resultCount.textContent = `${data.total} facture${data.total > 1 ? 's' : ''}`;
    renderInvoices(data.invoices);
    updatePagination(data.page, data.hasNext);
  } catch (error) {
    invoiceList.replaceChildren();
    message.textContent = error.message;
    message.classList.add('error');
  } finally {
    invoiceList.classList.remove('is-loading');
  }
}

function renderInvoices(invoices) {
  invoiceList.replaceChildren();
  if (!invoices.length) {
    const empty = document.createElement('p');
    empty.className = 'list-message';
    empty.textContent = 'Aucune facture enregistrée.';
    invoiceList.append(empty);
    return;
  }

  invoices.forEach((invoice) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const preview = invoice.fichier_mime === 'image/jpeg'
      ? document.createElement('img')
      : document.createElement('div');
    preview.className = 'product-image';
    if (preview.tagName === 'IMG') {
      preview.src = `/api/invoices/${encodeURIComponent(invoice.id)}/file`;
      preview.alt = `Aperçu de ${invoice.fichier_nom}`;
    } else {
      preview.textContent = 'PDF';
      preview.classList.add('file-preview');
    }
    card.append(preview);

    const content = document.createElement('div');
    content.className = 'product-content';
    const title = document.createElement('h3');
    title.textContent = invoice.nom_societe;
    const description = document.createElement('p');
    description.textContent = invoice.description;
    const details = document.createElement('span');
    details.className = 'product-detail';
    details.textContent = `${formatDate(invoice.date_chargement)} · ${invoice.fichier_nom}`;
    content.append(title, description, details);

    const action = document.createElement('a');
    action.className = 'button button-secondary';
    action.href = `/api/invoices/${encodeURIComponent(invoice.id)}/file`;
    action.target = '_blank';
    action.rel = 'noopener';
    action.textContent = invoice.fichier_mime === 'application/pdf' ? 'Ouvrir le PDF' : 'Voir le JPEG';
    card.append(content, action);
    invoiceList.append(card);
  });
}

function formatDate(value) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function updatePagination(page, hasNext) {
  pageIndicator.textContent = `Page ${page}`;
  previousButton.disabled = page <= 1;
  nextButton.disabled = !hasNext;
}

previousButton.addEventListener('click', () => fetchInvoices(currentPage - 1));
nextButton.addEventListener('click', () => fetchInvoices(currentPage + 1));
fetchInvoices(currentPage);
