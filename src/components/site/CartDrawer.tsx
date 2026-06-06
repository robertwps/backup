"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cart, cartDrawer, useCart, type CartItem } from "@/lib/cart-store";
import { brl } from "@/lib/format";
import { FreteSimulador } from "@/components/site/FreteSimulador";
import { supabase } from "@/integrations/supabase/client";

type OrderBumpProduct = {
  id: string;
  nome: string;
  preco: number;
  preco_promocional: number | null;
  imagem: string | null;
};

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [orderBump, setOrderBump] = useState<OrderBumpProduct | null>(null);
  const [bumpLoading, setBumpLoading] = useState(true);
  const { items, subtotal } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(cartDrawer.isOpen);
    const unsub = cartDrawer.subscribe((v) => setOpen(v));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const { data: category } = await supabase
          .from("categorias")
          .select("id")
          .eq("slug", "pingentes")
          .maybeSingle();
        if (!category?.id) {
          return;
        }

        const { data: products } = await supabase
          .from("produtos")
          .select("id, nome, preco, preco_promocional, imagem_principal")
          .eq("categoria_id", category.id)
          .eq("ativo", true)
          .order("preco", { ascending: true })
          .limit(1);

        if (isActive && products?.length) {
          const product = products[0];
          setOrderBump({
            id: product.id,
            nome: product.nome,
            preco: Number(product.preco),
            preco_promocional: product.preco_promocional ? Number(product.preco_promocional) : null,
            imagem: product.imagem_principal,
          });
        }
      } finally {
        if (isActive) setBumpLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const bumpVariantId = orderBump ? `pingente-${orderBump.id}` : "";
  const bumpAlreadyAdded = orderBump ? items.some((item) => item.variante_id === bumpVariantId) : false;
  const bumpPromoPrice = 29.9;
  const bumpOriginalPrice = orderBump ? Math.max(59.9, orderBump.preco) : 59.9;

  async function addOrderBump() {
    if (!orderBump) return;
    if (bumpAlreadyAdded) return;
    cart.add({
      produto_id: orderBump.id,
      variante_id: bumpVariantId,
      nome: orderBump.nome,
      slug: "pingente",
      comprimento: "único",
      preco_unit: bumpPromoPrice,
      preco_original: orderBump.preco,
      imagem: orderBump.imagem ?? "",
      quantidade: 1,
    });
    toast.success("Pingente de checkout adicionado ao carrinho.");
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) cartDrawer.close(); }}>
      <SheetContent className="flex w-full flex-col border-l border-border bg-background sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2 font-display text-lg text-foreground">
            <ShoppingBag className="size-5 text-gold" /> Meu Carrinho
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            <Button asChild variant="outline" className="border-gold/60 text-gold hover:bg-gold hover:text-gold-foreground">
              <Link to="/" onClick={() => cartDrawer.close()}>Explorar Coleção</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartRow key={item.variante_id} item={item} />
                ))}
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              {orderBump && items.length > 0 && (
                <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-background/80 via-neutral-950/80 to-background p-4 text-sm text-foreground shadow-[0_10px_30px_-20px_rgba(255,215,0,0.45)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card/70">
                      <img
                        src={orderBump.imagem ?? ""}
                        alt={orderBump.nome}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">Aproveite também</p>
                      <p className="mt-1 text-xs text-muted-foreground">🔥 Adicione um Pingente Exclusivo para combinar com sua corrente por apenas +{brl(bumpPromoPrice)}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="line-through">{brl(bumpOriginalPrice)}</div>
                      <div className="font-semibold text-gold">{brl(bumpPromoPrice)}</div>
                    </div>
                  </div>
                  <Button
                    onClick={addOrderBump}
                    className="mt-4 w-full bg-gold text-gold-foreground uppercase tracking-widest hover:bg-gold/90"
                    disabled={bumpAlreadyAdded}
                  >
                    {bumpAlreadyAdded ? "Adicionado" : "+ Adicionar"}
                  </Button>
                </div>
              )}

              <FreteSimulador compact />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-lg text-gold">{brl(subtotal)}</span>
              </div>
              <Button
                className="w-full bg-gold text-gold-foreground uppercase tracking-widest hover:bg-gold/90"
                onClick={() => { cartDrawer.close(); navigate({ to: "/checkout" }); }}
              >
                Finalizar Compra
              </Button>
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => cartDrawer.close()}
              >
                Continuar comprando
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartRow({ item }: { item: CartItem }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card/60 p-3">
      <div className="aspect-square h-20 w-20 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-neutral-900 to-black">
        <img src={item.imagem} alt={item.nome} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{item.nome}</p>
          <p className="text-xs text-muted-foreground">{item.comprimento}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-border p-1 text-muted-foreground transition hover:text-foreground"
              onClick={() => cart.update(item.variante_id, Math.max(1, item.quantidade - 1))}
            >
              <Minus className="size-3" />
            </button>
            <span className="min-w-[1.5rem] text-center text-sm">{item.quantidade}</span>
            <button
              className="rounded-md border border-border p-1 text-muted-foreground transition hover:text-foreground"
              onClick={() => cart.update(item.variante_id, item.quantidade + 1)}
            >
              <Plus className="size-3" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gold">{brl(item.preco_unit * item.quantidade)}</span>
            <button
              className="text-muted-foreground transition hover:text-destructive"
              onClick={() => cart.remove(item.variante_id)}
              aria-label="Remover"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
