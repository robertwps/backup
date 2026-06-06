import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube, ShieldCheck, Truck, CreditCard } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="font-display text-2xl tracking-widest">
              <span className="text-gold">ELITE</span><span className="text-platinum">316</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Correntes masculinas em Aço Inoxidável 316L. Forjadas para quem não recua.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-gold">Categorias</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/categoria/$slug" params={{ slug: "grumet" }} className="hover:text-foreground">Grumet</Link></li>
              <li><Link to="/categoria/$slug" params={{ slug: "veneziana" }} className="hover:text-foreground">Veneziana</Link></li>
              <li><Link to="/categoria/$slug" params={{ slug: "cordao-baiano" }} className="hover:text-foreground">Cordão Baiano</Link></li>
              <li><Link to="/categoria/$slug" params={{ slug: "pingentes" }} className="hover:text-foreground">Pingentes</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-gold">Institucional</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/institucional/$slug" params={{ slug: "sobre-a-marca" }} className="hover:text-foreground">Sobre a marca</Link></li>
              <li><Link to="/institucional/$slug" params={{ slug: "politica-de-troca" }} className="hover:text-foreground">Política de troca</Link></li>
              <li><Link to="/institucional/$slug" params={{ slug: "politica-de-privacidade" }} className="hover:text-foreground">Política de privacidade</Link></li>
              <li><Link to="/institucional/$slug" params={{ slug: "contato" }} className="hover:text-foreground">Contato</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-gold">Conecte-se</h4>
            <div className="flex gap-3 text-muted-foreground">
              <Instagram className="size-5 hover:text-gold transition-luxury cursor-pointer" />
              <Facebook className="size-5 hover:text-gold transition-luxury cursor-pointer" />
              <Youtube className="size-5 hover:text-gold transition-luxury cursor-pointer" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="size-4 text-gold" /> Site Seguro</span>
              <span className="flex items-center gap-1"><Truck className="size-4 text-gold" /> Frete Brasil</span>
              <span className="flex items-center gap-1"><CreditCard className="size-4 text-gold" /> Pix · Cartão</span>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2026 ELITE316. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
