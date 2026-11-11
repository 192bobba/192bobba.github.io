// Pop-up de vérification de l'âge (déclaratif, pour montrer le principe).
// La vraie vérification se fait au checkout avec la date de naissance.

const KEY = 'boutique-valais-3d:age';
const listeners = new Set();

function read() {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'adult' || value === 'minor' ? value : null;
  } catch {
    return null;
  }
}

let status = read();

export const isAdult = () => status === 'adult';
export const hasAnswered = () => status !== null;
export const onAgeChange = (fn) => listeners.add(fn);

function setStatus(value) {
  status = value;
  try { localStorage.setItem(KEY, value); } catch { /* pas grave : on redemandera */ }
  listeners.forEach((fn) => fn(value));
}

let openModal = null;

export function askAge({ minimumAge = 18 } = {}) {
  if (openModal) return openModal;

  openModal = new Promise((resolve) => {
    const page = [...document.body.children].filter((el) => el.tagName !== 'SCRIPT');
    const previousFocus = document.activeElement;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="age-title" aria-describedby="age-text">
        <img class="modal-logo" src="img/logo.jpg" alt="" width="72" height="72">
        <h2 id="age-title">Bienvenue en Valais !</h2>
        <p id="age-text">Notre boutique propose aussi de l'alcool et du schnoupf, réservés aux personnes de
          <strong>${minimumAge} ans et plus</strong>. Avez-vous ${minimumAge} ans ou plus&nbsp;?</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" data-answer="adult">Oui, j'ai ${minimumAge} ans ou plus</button>
          <button type="button" class="btn btn-outline" data-answer="minor">Non</button>
        </div>
        <p class="modal-note">Sans confirmation, vous pouvez quand même acheter nos vêtements.
          Une date de naissance sera demandée lors de la commande d'articles ${minimumAge}+.</p>
      </div>`;

    const buttons = [...backdrop.querySelectorAll('button')];

    // Garde le focus clavier dans la fenêtre tant qu'on n'a pas répondu.
    backdrop.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const index = buttons.indexOf(document.activeElement);
      const next = event.shiftKey ? index - 1 : index + 1;
      event.preventDefault();
      buttons[(next + buttons.length) % buttons.length].focus();
    });

    backdrop.addEventListener('click', (event) => {
      const button = event.target.closest('[data-answer]');
      if (!button) return;
      backdrop.remove();
      page.forEach((el) => { el.inert = false; });
      document.body.classList.remove('modal-open');
      openModal = null;
      setStatus(button.dataset.answer);
      previousFocus?.focus?.({ preventScroll: true });
      resolve(button.dataset.answer);
    });

    page.forEach((el) => { el.inert = true; });
    document.body.classList.add('modal-open');
    document.body.append(backdrop);
    buttons[0].focus();
  });

  return openModal;
}
