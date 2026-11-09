// Mini espace admin : connexion, liste / ajout / modification / suppression
// des produits, et consultation des commandes simulées.
//   #/admin                 → liste des produits
//   #/admin/nouveau         → ajouter un produit
//   #/admin/modifier/<id>   → modifier un produit
//   #/admin/commandes       → commandes reçues

import { api } from '../api.js';
import { state, categoryById } from '../state.js';
import { navigate, refresh } from '../router.js';
import { html, raw, imageOf, formatPrice, formatCents, formatDate, plural, setTitle, toast, showFieldErrors, showFormError, clearErrorsOnInput, PLACEHOLDER_IMAGE } from '../ui.js';
import { variantLabel } from '../pricing.js';

const MAX_UPLOAD_MB = 3;
const MAX_IMAGE_SIDE = 1600; // les grandes photos (téléphone) sont réduites à 1600 px

// Prépare une photo avant l'envoi : redressée, réduite et compressée dans le navigateur.
// Une photo de téléphone de 5 Mo devient ainsi une image d'environ 300 Ko.
async function prepareImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error("Ce fichier n'est pas une image lisible. Utilisez une photo JPG ou PNG.");
    }
  }
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');

  // Les PNG gardent leur transparence (produit détouré) ; les photos passent en JPG, plus léger.
  const keepTransparency = file.type === 'image/png' || file.type === 'image/webp';
  if (!keepTransparency) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  if (keepTransparency) {
    const png = canvas.toDataURL('image/png');
    if (png.length * 0.75 < MAX_UPLOAD_MB * 1024 * 1024 * 0.9) return png;
  }
  return canvas.toDataURL('image/jpeg', 0.86);
}

const SIZE_PRESETS = [
  ['Adulte', 'S, M, L, XL'],
  ['Adulte étendu', 'XS, S, M, L, XL, XXL'],
  ['Enfant', '4 ans, 6 ans, 8 ans, 10 ans, 12 ans'],
  ['Taille unique', 'Taille unique'],
  ['Aucune', ''],
];

export async function renderAdmin(view, [subPath = '']) {
  setTitle('Admin');
  if (!api.admin.isLoggedIn()) return renderLogin(view);

  try {
    const edit = /^modifier\/([\w-]+)$/.exec(subPath);
    if (subPath === 'nouveau') await renderProductForm(view, null);
    else if (edit) await renderProductForm(view, edit[1]);
    else if (subPath === 'commandes') await renderOrders(view);
    else await renderProductList(view);
  } catch (error) {
    if (error.status === 401) return renderLogin(view, error.message);
    throw error;
  }

  view.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await api.admin.logout();
    toast('Vous êtes déconnecté.');
    navigate('/admin');
  });
}

// ---- Connexion ------------------------------------------------------------

function renderLogin(view, message = '') {
  view.innerHTML = html`
    <div class="container section">
      <div class="card login-card">
        <img src="/img/logo.jpg" alt="" width="64" height="64">
        <h1>Espace admin</h1>
        <p class="muted">Gestion des produits et des commandes.</p>
        <form novalidate>
          <div class="field">
            <label for="admin-password">Mot de passe</label>
            <input id="admin-password" name="password" type="password" autocomplete="current-password" required>
          </div>
          <p class="form-error" role="alert" ${message ? '' : raw('hidden')}>${message}</p>
          <button class="btn btn-primary btn-block" type="submit">Se connecter</button>
          <p class="field-hint" style="margin-top:12px">Prototype : le mot de passe par défaut est indiqué dans le fichier README.md.</p>
        </form>
      </div>
    </div>`;

  const form = view.querySelector('form');
  const errorEl = form.querySelector('.form-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await api.admin.login(form.elements.password.value);
      refresh();
    } catch (error) {
      showFormError(errorEl, error.message);
      button.disabled = false;
      form.elements.password.select();
    }
  });
}

// ---- En-tête commun ------------------------------------------------------------

const adminHeader = (active) => html`
  <div class="admin-head">
    <h1>Espace admin</h1>
    <button type="button" class="btn btn-ghost btn-sm" data-logout>Se déconnecter</button>
  </div>
  <nav class="admin-tabs" aria-label="Sections admin">
    <a href="#/admin" class="${active === 'produits' ? 'is-active' : ''}">Produits</a>
    <a href="#/admin/commandes" class="${active === 'commandes' ? 'is-active' : ''}">Commandes</a>
  </nav>`;

// ---- Liste des produits ---------------------------------------------------------

async function renderProductList(view) {
  const products = await api.products();

  view.innerHTML = html`
    <div class="container section">
      ${adminHeader('produits')}
      <div class="admin-toolbar">
        <p class="muted">${plural(products.length, 'produit')}</p>
        <a class="btn btn-primary" href="#/admin/nouveau">+ Ajouter un produit</a>
      </div>
      <ul class="admin-list">
        ${products.map((p) => html`
          <li class="admin-item">
            <img src="${imageOf(p)}" alt="" width="64" height="64" loading="lazy">
            <div class="admin-item-info">
              <strong>${p.name}</strong>
              <span>${categoryById(p.category)?.name || p.category} · ${formatPrice(p.price)}</span>
              ${p.featured ? html`<span><span class="badge badge-soft">Mis en avant</span></span>` : ''}
            </div>
            <div class="admin-item-actions">
              <a class="btn btn-sm btn-outline" href="#/produit/${p.id}">Voir</a>
              <a class="btn btn-sm btn-outline" href="#/admin/modifier/${p.id}">Modifier</a>
              <button type="button" class="btn btn-sm btn-danger" data-delete="${p.id}" data-name="${p.name}">Supprimer</button>
            </div>
          </li>`)}
      </ul>
    </div>`;

  view.querySelector('.admin-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    if (!confirm(`Supprimer « ${button.dataset.name} » ?\nCette action est définitive.`)) return;
    button.disabled = true;
    try {
      await api.admin.deleteProduct(button.dataset.delete);
      toast('Produit supprimé.');
      refresh();
    } catch (error) {
      button.disabled = false;
      if (error.status === 401) return refresh();
      toast(error.message);
    }
  });
}

// ---- Formulaire produit ---------------------------------------------------------

const textField = ({ name, label, value = '', hint = '', attrs = '', required = false, prefix = '' }) => html`
  <div class="field" data-field="${name}">
    <label for="p-${name}">${label}${required ? '' : html` <span class="optional">(facultatif)</span>`}</label>
    ${prefix ? raw('<div class="input-prefix">') : ''}
      ${prefix ? html`<span>${prefix}</span>` : ''}
      <input id="p-${name}" name="${name}" type="text" value="${value}" ${raw(attrs)}>
    ${prefix ? raw('</div>') : ''}
    ${hint ? html`<p class="field-hint">${hint}</p>` : ''}
    <p class="field-error" hidden></p>
  </div>`;

async function renderProductForm(view, id) {
  const product = id
    ? await api.product(id).catch((error) => { if (error.status === 404) return null; throw error; })
    : { name: '', category: '', price: '', description: '', image: '', sizes: [], colors: [], featured: false };

  if (!product) {
    view.innerHTML = html`<div class="container section">${adminHeader('produits')}
      <div class="notice notice-warning">Ce produit n'existe plus.</div>
      <a class="btn btn-outline" href="#/admin">Retour à la liste</a></div>`;
    return;
  }

  setTitle(id ? `Modifier ${product.name}` : 'Nouveau produit');

  view.innerHTML = html`
    <div class="container section">
      ${adminHeader('produits')}
      <h2>${id ? `Modifier « ${product.name} »` : 'Nouveau produit'}</h2>
      <form class="card admin-form" novalidate>
        ${textField({ name: 'name', label: 'Nom du produit', value: product.name, required: true, attrs: 'maxlength="80" required' })}

        <div class="field" data-field="category">
          <label for="p-category">Catégorie</label>
          <select id="p-category" name="category" required>
            <option value="">— Choisir —</option>
            ${state.categories.map((c) => html`
              <option value="${c.id}" ${c.id === product.category ? raw('selected') : ''}>${c.name}${c.restricted ? ' (18+)' : ''}</option>`)}
          </select>
          <p class="field-error" hidden></p>
        </div>

        ${textField({ name: 'price', label: 'Prix', value: product.price === '' ? '' : Number(product.price).toFixed(2), required: true, prefix: 'CHF', attrs: 'inputmode="decimal" placeholder="34.90" required' })}

        <div class="field" data-field="description">
          <label for="p-description">Description <span class="optional">(facultatif)</span></label>
          <textarea id="p-description" name="description" maxlength="2000">${product.description}</textarea>
          <p class="field-error" hidden></p>
        </div>

        ${textField({ name: 'sizes', label: 'Tailles', value: product.sizes.join(', '), hint: 'Séparées par des virgules. Laissez vide si le produit n’a pas de taille.', attrs: 'placeholder="S, M, L, XL"' })}
        <div class="presets" aria-label="Tailles prédéfinies" style="margin:-6px 0 16px">
          ${SIZE_PRESETS.map(([label, value]) => html`<button type="button" class="preset" data-sizes="${value}">${label}</button>`)}
        </div>

        ${textField({ name: 'colors', label: 'Couleurs', value: product.colors.join(', '), hint: 'Séparées par des virgules, par ex. : Rouge, Blanc, Noir. Laissez vide si aucune.', attrs: 'placeholder="Rouge, Blanc"' })}

        <div class="field" data-field="image">
          <label for="p-image">Image <span class="optional">(facultatif)</span></label>
          <div class="image-field" data-drop-zone>
            <img class="image-preview" src="${imageOf(product)}" alt="Aperçu de l'image" width="140" height="140">
            <div>
              <span class="btn btn-sm btn-outline file-button">
                Choisir une photo…
                <input type="file" accept="image/*" aria-label="Choisir une photo">
              </span>
              <p class="field-hint" data-upload-status>Ou glissez une photo ici. Idéal : photo carrée, produit centré, fond clair.
                Les grandes photos sont réduites automatiquement.</p>
            </div>
            <input id="p-image" name="image" type="text" value="${product.image}" placeholder="/img/produits/... ou https://...">
          </div>
          <p class="field-error" hidden></p>
        </div>

        <label class="checkbox">
          <input type="checkbox" name="featured" ${product.featured ? raw('checked') : ''}>
          Mettre en avant sur la page d'accueil
        </label>

        <p class="form-error" role="alert" hidden></p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${id ? 'Enregistrer les modifications' : 'Ajouter le produit'}</button>
          <a class="btn btn-ghost" href="#/admin">Annuler</a>
        </div>
      </form>
    </div>`;

  const form = view.querySelector('form');
  const formError = form.querySelector('.form-error');
  const preview = form.querySelector('.image-preview');
  const imageInput = form.elements.image;
  const uploadStatus = form.querySelector('[data-upload-status]');
  clearErrorsOnInput(form);

  form.querySelector('.presets').addEventListener('click', (event) => {
    const button = event.target.closest('[data-sizes]');
    if (button) form.elements.sizes.value = button.dataset.sizes;
  });

  imageInput.addEventListener('change', () => {
    delete preview.dataset.fallback;
    preview.src = imageInput.value.trim() || PLACEHOLDER_IMAGE;
  });

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      uploadStatus.textContent = "Ce fichier n'est pas une image.";
      return;
    }
    uploadStatus.textContent = 'Préparation et envoi de la photo…';
    try {
      const { url } = await api.admin.uploadImage(await prepareImage(file));
      imageInput.value = url;
      delete preview.dataset.fallback;
      preview.src = url;
      uploadStatus.textContent = 'Photo ajoutée ✓ Cliquez sur « Enregistrer » pour la garder.';
    } catch (error) {
      uploadStatus.textContent = error.message;
    }
  };

  const fileInput = form.querySelector('input[type="file"]');
  fileInput.addEventListener('change', async () => {
    await uploadFile(fileInput.files[0]);
    fileInput.value = '';
  });

  // Glisser-déposer une photo sur la zone image.
  const dropZone = form.querySelector('[data-drop-zone]');
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    uploadFile(event.dataTransfer.files[0]);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.featured = form.elements.featured.checked;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const saved = await api.admin.saveProduct(id, data);
      toast(id ? 'Modifications enregistrées.' : `« ${saved.name} » a été ajouté.`, {
        actionHref: `#/produit/${saved.id}`,
        actionLabel: 'Voir',
      });
      navigate('/admin');
    } catch (error) {
      if (error.status === 401) return refresh();
      showFieldErrors(form, error.details || {});
      showFormError(formError, error.message);
      submit.disabled = false;
    }
  });
}

// ---- Commandes ------------------------------------------------------------------

async function renderOrders(view) {
  const orders = await api.admin.orders();
  setTitle('Commandes');

  view.innerHTML = html`
    <div class="container section">
      ${adminHeader('commandes')}
      ${orders.length ? html`
        <p class="muted">${plural(orders.length, 'commande')} simulée${orders.length > 1 ? 's' : ''} (la plus récente en premier).</p>
        <ul class="order-list">
          ${orders.map((order) => html`
            <li class="card order">
              <details>
                <summary>
                  <span class="order-number">${order.number}</span>
                  <span class="order-meta">${formatDate(order.createdAt)} · ${order.customer.firstName} ${order.customer.lastName}
                    ${order.containsRestricted ? html` <span class="badge badge-age">18+</span>` : ''}</span>
                  <span class="order-total">${formatCents(order.totalCents)}</span>
                </summary>
                <div class="order-body">
                  <ul>
                    ${order.items.map((item) => html`
                      <li>${item.qty} × ${item.name}${variantLabel(item) ? ` (${variantLabel(item)})` : ''} — ${formatCents(item.lineCents)}</li>`)}
                  </ul>
                  <p>
                    <strong>Client :</strong> ${order.customer.firstName} ${order.customer.lastName},
                    ${order.customer.email}${order.customer.phone ? `, ${order.customer.phone}` : ''}<br>
                    <strong>Adresse :</strong> ${order.customer.address}, ${order.customer.zip} ${order.customer.city}<br>
                    ${order.customer.birthDate ? html`<strong>Date de naissance :</strong> ${order.customer.birthDate}<br>` : ''}
                    <strong>Paiement :</strong> ${order.paymentLabel} (simulé) ·
                    <strong>Livraison :</strong> ${order.shippingCents ? formatCents(order.shippingCents) : 'offerte'}
                  </p>
                </div>
              </details>
            </li>`)}
        </ul>` : html`
        <div class="notice">Aucune commande pour l'instant. Passez une commande test depuis la boutique pour la voir apparaître ici.</div>`}
    </div>`;
}
