export function brl(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(text: string): string {
  return `${slugify(text)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function discountPct(preco: number, promo: number | null | undefined): number | null {
  if (!promo || promo <= 0 || promo >= preco) return null;
  return Math.round(((preco - promo) / preco) * 100);
}

export function effectivePrice(preco: number, promo: number | null | undefined): number {
  return promo && promo > 0 && promo < preco ? promo : preco;
}
