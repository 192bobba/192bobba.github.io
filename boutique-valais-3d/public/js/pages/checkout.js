// Checkout simulé : coordonnées, date de naissance si besoin, paiement fictif.

import { api } from '../api.js';
import { cart } from '../cart.js';
import { state, isRestricted } from '../state.js';
import { navigate } from '../router.js';
import { ageFromBirthDate } from '../shared/age.js';
import { resolveCart, computeTotals, variantLabel } from '../pricing.js';
import { html, raw, emptyState, formatCents, setTitle, steps, showFieldErrors, showFormError, clearErrorsOnInput } from '../ui.js';
import { summaryRows } from './cart.js';

export const LAST_ORDER_KEY = 'boutique-valais-3d:derniere-commande';
const DRAFT_KEY = 'boutique-valais-3d:brouillon-commande';

const PAYMENT_OPTIONS = [
  ['carte', 'Carte de crédit'],
  ['twint', 'TWINT'],
  ['facture', 'Facture'],
];

const field = ({ name, label, type = 'text', autocomplete = 'on', required = true, hint = '', attrs = '' }) => html`
  <div class="field" data-field="${name}">
    <label for="f-${name}">${label}${required ? '' : html` <span class="optional">(facultatif)</span>`}</label>
    <input id="f-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}"
      ${required ? raw('required') : ''} ${raw(attrs)}>
    ${hint ? html`<p class="field-hint">${hint}</p>` : ''}
    <p class="field-error" hidden></p>
  </div>`;

function validate(data, needsAge, minimumAge) {
  const errors = {};
  const required = {
    firstName: 'Indiquez votre prénom.',
    lastName: 'Indiquez votre nom.',
    address: 'Indiquez votre adresse.',
    city: 'Indiquez votre localité.',
  };
  for (const [name, message] of Object.entries(required)) {
    if (!data[name]?.trim()) errors[name] = message;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email?.trim() || '')) errors.email = 'Indiquez une adresse e-mail valide.';
  if (!/^\d{4}$/.test(data.zip?.trim() || '')) errors.zip = 'Le NPA comporte 4 chiffres.';
  if (!data.payment) errors.payment = 'Choisissez un moyen de paiement.';
  if (needsAge) {
    const age = ageFromBirthDate(data.birthDate);
    if (age === null) errors.birthDate = 'Indiquez votre date de naissance.';
    else if (age < minimumAge) {
      errors.birthDate = `Vous devez avoir au moins ${minimumAge} ans pour commander de l'alcool ou du schnoupf. Retirez ces articles du panier pour continuer.`;
    }
  }
  return errors;
}

function readDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || {}; } catch { return {}; }
}

function saveDraft(form) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(Object.fromEntries(new FormData(form)))); } catch { /* ignoré */ }
}

export async function renderCheckout(view) {
  const products = await api.products();
  const { lines, invalid } = resolveCart(cart.items(), products);
  setTitle('Commande');

  // Un article n'existe plus : on repasse par le panier, qui le retire et prévient le client.
  if (invalid.length) {
    navigate('/panier');
    return;
  }

  if (!lines.length) {
    view.innerHTML = html`<div class="container">${emptyState({
      title: 'Votre panier est vide',
      text: 'Ajoutez des articles avant de passer commande.',
      actionHref: '#/boutique',
      actionLabel: 'Voir la boutique',
    })}</div>`;
    return;
  }

  const { minimumAge } = state.config;
  const needsAge = lines.some((line) => isRestricted(line.product));
  const totals = computeTotals(lines, state.config);
  const today = new Date().toISOString().slice(0, 10);

  view.innerHTML = html`
    <div class="container section">
      ${steps(2)}
      <h1>Finaliser ma commande</h1>
      <form class="checkout-layout" novalidate>
        <div>
          <section class="form-section">
            <h2>Vos coordonnées</h2>
            <div class="field-row">
              ${field({ name: 'firstName', label: 'Prénom', autocomplete: 'given-name' })}
              ${field({ name: 'lastName', label: 'Nom', autocomplete: 'family-name' })}
            </div>
            ${field({ name: 'email', label: 'E-mail', type: 'email', autocomplete: 'email', hint: 'Pour le suivi de commande (aucun e-mail envoyé dans ce prototype).' })}
            ${field({ name: 'phone', label: 'Téléphone', type: 'tel', autocomplete: 'tel', required: false })}
          </section>

          <section class="form-section">
            <h2>Adresse de livraison</h2>
            ${field({ name: 'address', label: 'Rue et numéro', autocomplete: 'street-address' })}
            <div class="field-row zip-city">
              ${field({ name: 'zip', label: 'NPA', autocomplete: 'postal-code', attrs: 'inputmode="numeric" maxlength="4" placeholder="1950"' })}
              ${field({ name: 'city', label: 'Localité', autocomplete: 'address-level2', attrs: 'placeholder="Sion"' })}
            </div>
            <p class="field-hint">Livraison en Suisse uniquement.</p>
          </section>

          ${needsAge ? html`
            <section class="form-section">
              <h2>Vérification de l'âge</h2>
              <div class="notice notice-warning">
                Votre panier contient de l'alcool ou du schnoupf : la vente est réservée aux ${minimumAge} ans et plus.
              </div>
              ${field({ name: 'birthDate', label: 'Date de naissance', type: 'date', autocomplete: 'bday', attrs: `max="${today}" min="1900-01-01"` })}
            </section>` : ''}

          <section class="form-section">
            <h2>Paiement</h2>
            <div class="notice">Paiement <strong>simulé</strong> : aucun montant ne sera débité.</div>
            <fieldset class="field" data-field="payment">
              <legend class="visually-hidden">Moyen de paiement</legend>
              <div class="payment-options">
                ${PAYMENT_OPTIONS.map(([value, label], i) => html`
                  <label class="payment-option">
                    <input type="radio" name="payment" value="${value}" ${i === 0 ? raw('checked') : ''}>
                    ${label}
                  </label>`)}
              </div>
              <p class="field-error" hidden></p>
            </fieldset>
          </section>
        </div>

        <aside class="card summary" aria-label="Récapitulatif de la commande">
          <h2>Récapitulatif</h2>
          <ul class="summary-items">
            ${lines.map((line) => html`
              <li>
                <span>${line.qty} × ${line.product.name}
                  ${variantLabel(line) ? html`<span class="muted">${variantLabel(line)}</span>` : ''}</span>
                <span>${formatCents(line.lineCents)}</span>
              </li>`)}
          </ul>
          ${summaryRows(totals)}
          <div class="summary-row summary-total"><span>Total</span><span>${formatCents(totals.total)}</span></div>
          <p class="form-error" role="alert" hidden></p>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Confirmer la commande</button>
          <p class="summary-note"><a href="#/panier">Modifier mon panier</a></p>
        </aside>
      </form>
    </div>`;

  const form = view.querySelector('form');
  const submitButton = form.querySelector('[type="submit"]');
  const formError = form.querySelector('.form-error');

  // Restaure ce qui avait déjà été saisi (si on revient du panier par exemple).
  for (const [name, value] of Object.entries(readDraft())) {
    const input = form.elements[name];
    if (input && typeof value === 'string') input.value = value;
  }
  form.addEventListener('input', () => saveDraft(form));
  clearErrorsOnInput(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = validate(data, needsAge, minimumAge);
    showFieldErrors(form, errors);
    if (Object.keys(errors).length) {
      showFormError(formError, 'Merci de corriger les champs indiqués.');
      return;
    }

    showFormError(formError, '');
    submitButton.disabled = true;
    submitButton.textContent = 'Validation en cours…';

    try {
      const order = await api.createOrder({
        customer: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          zip: data.zip,
          city: data.city,
          birthDate: data.birthDate,
        },
        items: lines.map(({ productId, size, color, qty }) => ({ productId, size, color, qty })),
        payment: data.payment,
      });
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
        sessionStorage.removeItem(DRAFT_KEY);
      } catch { /* ignoré */ }
      cart.clear();
      navigate('/confirmation');
    } catch (error) {
      if (error.details) showFieldErrors(form, error.details);
      showFormError(formError, error.message);
      submitButton.disabled = false;
      submitButton.textContent = 'Confirmer la commande';
    }
  });
}
