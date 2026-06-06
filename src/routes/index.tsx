import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ProductCard, type ProductCardData } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Truck, Award, ArrowRight } from "lucide-react";
import hero from "@/assets/hero-corrente.jpg";
import catGrumet from "@/assets/cat-grumet.jpg";
import catVeneziana from "@/assets/cat-veneziana.jpg";
import catBaiano from "@/assets/cat-baiano.jpg";
import catPingentes from "@/assets/cat-pingentes.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELITE316 — Correntes Masculinas em Aço 316L" },
      { name: "description", content: "Correntes, cordões e pingentes em Aço Inoxidável 316L. Design industrial de luxo para o homem que não recua." },
    ],
  }),
  component: Home,
});

const categorias = [
  { slug: "grumet", nome: "Grumet", img: catGrumet },
  { slug: "veneziana", nome: "Veneziana", img: catVeneziana },
  { slug: "cordao-baiano", nome: "Cordão Baiano", img: catBaiano },
  { slug: "pingentes-aco-316l", nome: "Pingentes", img: catPingentes },
];

function Home() {
  const { data: destaques = [] } = useQuery({
    queryKey: ["produtos-destaque"],
    queryFn: async (): Promise<ProductCardData[]> => {
      const { data } = await supabase
        .from("produtos")
        .select("id, nome, slug, preco, preco_promocional, imagem_principal")
        .eq("ativo", true)
        .order("criado_em", { ascending: false })
        .limit(8);
      return (data ?? []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        slug: p.slug,
        preco: Number(p.preco),
        preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : null,
        imagem: p.imagem_principal ?? hero,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={hero} alt="Corrente de aço 316L masculina" className="size-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        </div>
        <div className="container mx-auto px-4 py-28 md:py-40">
          <span className="inline-block border border-gold/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-gold">
            Aço Inoxidável 316L · Não enferruja
          </span>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-tight tracking-tight text-foreground md:text-7xl">
            Forjadas para <span className="text-gold">quem não recua.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Correntes, cordões e pingentes masculinos em aço cirúrgico 316L. Hipoalergênicos, à prova de suor, banho e oceano.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/categoria/$slug" params={{ slug: "grumet" }}>
              <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 uppercase tracking-widest">
                Ver Coleção <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link to="/categoria/$slug" params={{ slug: "pingentes-aco-316l" }}>
              <Button size="lg" variant="outline" className="border-platinum/30 uppercase tracking-widest">
                Pingentes
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Coleção</p>
            <h2 className="mt-2 font-display text-3xl text-foreground md:text-4xl">Escolha seu estilo</h2>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categorias.map((c) => (
            <Link
              key={c.slug}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="group relative aspect-[3/4] overflow-hidden rounded-md border border-border bg-card transition-luxury hover:border-gold"
            >
              <img src={c.img} alt={c.nome} className="size-full object-cover transition-luxury group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="font-display text-2xl text-platinum group-hover:text-gold transition-luxury">{c.nome}</h3>
                <span className="mt-1 inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground">
                  Explorar <ArrowRight className="ml-1 size-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTAQUES */}
      <section className="container mx-auto px-4 py-10">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Em Destaque</p>
          <h2 className="mt-2 font-display text-3xl text-foreground md:text-4xl">Mais desejadas</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="border-y border-border bg-card/40 mt-20">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Garantia Vitalícia", d: "Aço 316L não enferruja, não escurece." },
            { icon: Truck, t: "Frete para todo Brasil", d: "Envio em até 24h após confirmação." },
            { icon: Award, t: "Qualidade Cirúrgica", d: "Mesmo aço usado em implantes médicos." },
          ].map((b) => (
            <div key={b.t} className="flex items-start gap-4">
              <b.icon className="size-8 shrink-0 text-gold" />
              <div>
                <h4 className="font-display text-lg text-foreground">{b.t}</h4>
                <p className="text-sm text-muted-foreground">{b.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
