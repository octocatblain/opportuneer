/** Country helpers for choosing job boards and region terms. No imports: also loaded by the middleware. */

const AFRICA = [
  "algeria", "angola", "benin", "botswana", "burkina faso", "burundi", "cameroon", "cape verde", "chad", "congo", "cote d'ivoire", "ivory coast", "djibouti", "egypt", "eritrea",
  "eswatini", "ethiopia", "gabon", "gambia", "ghana", "guinea", "kenya", "lesotho", "liberia", "libya", "madagascar", "malawi", "mali", "mauritania", "mauritius", "morocco",
  "mozambique", "namibia", "niger", "nigeria", "rwanda", "senegal", "sierra leone", "somalia", "south africa", "south sudan", "sudan", "tanzania", "togo", "tunisia", "uganda",
  "zambia", "zimbabwe",
];

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export const isKenya = (country: string | null | undefined) => /\bkenya\b/.test(norm(country));
export const isAfrica = (country: string | null | undefined) => AFRICA.includes(norm(country)) || /\bafrica\b/.test(norm(country));

/** Words a remote post can use to say it is open to someone in this country. */
export function regionTermsFor(country: string | null | undefined): string[] {
  const c = norm(country);
  if (!c) return [];
  return isAfrica(c) ? [c, "africa", "african", "sub-saharan", ...(isKenya(c) ? ["kenyan", "nairobi", "east africa"] : [])] : [c];
}
