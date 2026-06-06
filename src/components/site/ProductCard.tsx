import { Link } from "@tanstack/react-router";
import { brl, discountPct, effectivePrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export type ProductCardData = {
  id: string;
  nome: string;
  slug: string;
  preco: number;
  preco_promocional: number | null;
  imagem: string;
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const pct = discountPct(p.preco, p.preco_promocional);
  const finalPrice = effectivePrice(p.preco, p.preco_promocional);

  return (
    <Link
      to="/produto/$slug"
      params={{ slug: p.slug }}
      className="group block overflow-hidden rounded-md border border-border bg-card transition-luxury hover:border-gold hover:shadow-gold"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-hero">
        <img
          src={p.imagem}
          alt={p.nome}
          loading="lazy"
          className="size-full object-cover transition-luxury group-hover:scale-105"
        />
        {pct && (
          <Badge className="absolute left-3 top-3 bg-gold text-gold-foreground hover:bg-gold border-0 font-bold tracking-wider">
            {pct}% OFF
          </Badge>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-foreground">{p.nome}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          {p.preco_promocional ? (
            <>
              <span className="text-xs text-muted-foreground line-through">{brl(p.preco)}</span>
              <span className="text-lg font-bold text-gold">{brl(finalPrice)}</span>
            </>
          ) : (
            <span className="text-lg font-bold text-platinum">{brl(p.preco)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
