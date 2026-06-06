"use client";

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cart, cartDrawer, useCart, type CartItem } from "@/lib/cart-store";
import { brl } from "@/lib/format";
import { FreteSimulador } from "@/components/site/FreteSimulador";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, subtotal } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(cartDrawer.isOpen);
    const unsub = cartDrawer.subscribe((v) => setOpen(v));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
