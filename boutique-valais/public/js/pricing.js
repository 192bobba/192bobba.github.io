// Calculs du panier, en centimes pour éviter les erreurs d'arrondi.
// Le serveur refait toujours ces calculs : ceux-ci servent à l'affichage.

export const toCents = (chf) => Math.round(Number(chf) * 100);

// Associe les lignes du panier aux produits. Les articles supprimés ou dont
// la variante n'existe plus sont renvoyés dans « invalid ».
export function resolveCart(items, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = [];
  const invalid = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    const sizeOk = product && (product.sizes?.length ? product.sizes.includes(item.size) : !item.size);
    const colorOk = product && (product.colors?.length ? product.colors.includes(item.color) : !item.color);
    if (!product || !sizeOk || !colorOk) {
      invalid.push(item);
      continue;
    }
    const unitCents = toCents(product.price);
    lines.push({ ...item, product, unitCents, lineCents: unitCents * item.qty });
  }
  return { lines, invalid };
}

export function computeTotals(lines, config) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineCents, 0);
  const freeFrom = toCents(config.shipping.freeFrom);
  const shipping = !lines.length || subtotal >= freeFrom ? 0 : toCents(config.shipping.cost);
  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    freeFrom,
    remainingForFreeShipping: Math.max(0, freeFrom - subtotal),
  };
}

export const variantLabel = (line) => [line.size && `Taille ${line.size}`, line.color].filter(Boolean).join(' · ');
