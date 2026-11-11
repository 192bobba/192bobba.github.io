// Erreur « attendue » (données invalides, produit introuvable…) avec un code HTTP
// et, si besoin, le détail des champs à corriger.
// Utilisée par le serveur ET par la version de démonstration en ligne.
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
