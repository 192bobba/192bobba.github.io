// Navigation par « hash » : #/boutique, #/produit/xyz, #/panier...
// Fonctionne sans configuration particulière du serveur.

let render = () => {};

export function startRouter(renderFn) {
  render = renderFn;
  window.addEventListener('hashchange', render);
  render();
}

export const currentPath = () => location.hash.replace(/^#/, '') || '/';

export const refresh = () => render();

export function navigate(path) {
  if (currentPath() === path) refresh();
  else location.hash = path;
}
