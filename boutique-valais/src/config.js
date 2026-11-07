// Réglages du prototype. Modifiez les valeurs ici puis relancez le serveur.

const config = {
  // Nom affiché dans l'en-tête et l'onglet du navigateur.
  shopName: 'Boutique 13 Étoiles',

  // Adresse locale : http://localhost:3000
  port: Number(process.env.PORT) || 3000,

  // Mot de passe de l'espace admin (protection basique, prototype uniquement).
  adminPassword: process.env.ADMIN_PASSWORD || 'valais1815',

  // Âge minimum pour l'alcool et le schnoupf.
  minimumAge: 18,

  currency: 'CHF',

  // Frais de port (en CHF) et seuil de livraison offerte.
  shipping: {
    cost: 7,
    freeFrom: 80,
  },

  // Taille maximale d'une image envoyée depuis l'admin (3 Mo).
  maxUploadBytes: 3 * 1024 * 1024,
};

export default config;
