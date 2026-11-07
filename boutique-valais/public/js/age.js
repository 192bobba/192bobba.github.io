// Calcule l'âge à partir d'une date « AAAA-MM-JJ ». Renvoie null si la date est invalide.
// (Même logique que src/age.js côté serveur, qui refait la vérification.)
export function ageFromBirthDate(value, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate || year < 1900) return null;

  let age = today.getFullYear() - year;
  const birthdayPassed =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayPassed) age -= 1;
  return age < 0 ? null : age;
}
