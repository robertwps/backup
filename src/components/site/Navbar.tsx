import { Link } from "@tanstack/react-router";
import { ShoppingBag, User, Menu, X, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart, cartDrawer } from "@/lib/cart-store";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const categorias = [
  { slug: "grumet", nome: "Grumet" },
  { slug: "veneziana", nome: "Veneziana" },
  { slug: "cordao-baiano", nome: "Cordão Baiano" },
  { slug: "pingentes", nome: "Pingentes" },
];

export function Navbar() {
  const { count } = useCart();
  const [mobile, setMobile] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = user?.email === "elite316@outlook.com.br";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-widest text-gold">ELITE</span>
          <span className="font-display text-2xl tracking-widest text-platinum">316</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm uppercase tracking-wider md:flex">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-luxury">Home</Link>
          {categorias.map((c) => (
            <Link
              key={c.slug}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="text-muted-foreground hover:text-gold transition-luxury"
            >
              {c.nome}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="hidden gap-1 text-gold md:flex">
                <Crown className="size-4" /> Painel Admin
              </Button>
            </Link>
          )}
          <Link to="/minha-conta">
            <Button variant="ghost" size="icon" aria-label="Área do cliente">
              <User className="size-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Carrinho"
            onClick={() => cartDrawer.open()}
            className="relative"
          >
            <ShoppingBag className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                {count}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setMobile((m) => !m)}
          >
            {mobile ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>
      {mobile && (
        <nav className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm uppercase tracking-wider">
            <Link to="/" onClick={() => setMobile(false)}>Home</Link>
            {categorias.map((c) => (
              <Link key={c.slug} to="/categoria/$slug" params={{ slug: c.slug }} onClick={() => setMobile(false)}>
                {c.nome}
              </Link>
            ))}
            <Link to="/minha-conta" onClick={() => setMobile(false)}>Área do Cliente</Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobile(false)} className="text-gold">
                Painel Admin
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
