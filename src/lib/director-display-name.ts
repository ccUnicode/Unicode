/** Short email names; keep the full registered identity unchanged. */
export function directorDisplayName(name: string, email: string): string {
  if (email.trim().toLowerCase() === 'yoissy.araujo.e@uni.pe') return 'Korelly Araujo';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || email;
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Institutional addresses identify the first surname, including names with several given names.
  const institutionalSurname = email.toLowerCase().endsWith('@uni.pe') ? email.split('@')[0].split('.')[1] : undefined;
  const surname = parts.slice(1).find(part => institutionalSurname && normalize(part) === normalize(institutionalSurname))
    || parts[parts.length > 2 ? parts.length - 2 : 1];
  return `${parts[0]} ${surname}`;
}
