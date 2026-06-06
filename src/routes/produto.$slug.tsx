import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Ruler, ShoppingBag, ShieldCheck, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cart, cartDrawer } from "@/lib/cart-store";
import { brl, discountPct, effectivePrice } from "@/lib/format";


export const Route = createFileRoute("/produto/$slug")({
  component: ProdutoPage,
});

const COMPRIMENTOS = ["50cm", "55cm", "60cm", "65cm", "70cm", "75cm", "80cm"] as const;

const GUIDE_ROWS: { size: string; desc: string }[] = [
  { size: "50cm", desc: "Rente à base do pescoço (linha da clavícula)." },
  { size: "55cm", desc: "Logo abaixo da clavícula. Altura média padrão." },
  { size: "60cm", desc: "Altura do início do peito. O tamanho mais vendido, ótimo com pingentes." },
  { size: "65cm", desc: "Meio do peito. Estilo despojado e marcante." },
  { size: "70cm", desc: "Altura do peito baixo. Visual streetwear, ótimo sobre moletons." },
  { size: "75cm", desc: "Estilo urbano longo, perfeito para sobreposição de correntes." },
  { size: "80cm", desc: "Estilo urbano longo, perfeito para sobreposição de correntes." },
];

type ProdutoData = {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  preco: number;
  preco_promocional: number | null;
  imagem_principal: string | null;
  material: string;
  categoria_id: string | null;
  imagens: string[];
};

type RelatedProduct = {
  id: string;
  nome: string;
  slug: string;
  preco: number;
  preco_promocional: number | null;
  imagem: string | null;
};

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='%23262626'/><stop offset='1' stop-color='%230d0d0d'/></linearGradient></defs><rect fill='url(%23g)' width='800' height='800'/><text x='50%' y='50%' fill='%23a3a3a3' font-family='serif' font-size='40' text-anchor='middle' dy='.35em'>PLATINUM 316L</text></svg>`,
  );

type ComboConfig = {
  ativo: boolean;
  desconto: number;
  titulo: string;
  produto: {
    id: string;
    nome: string;
    slug: string;
    preco: number;
    preco_promocional: number | null;
    imagem: string | null;
  } | null;
};

function ProdutoPage() {
  const { slug } = Route.useParams();

  const navigate = useNavigate();
  const [produto, setProduto] = useState<ProdutoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [comprimento, setComprimento] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [variantes, setVariantes] = useState<{ comprimento: string; estoque: number }[]>([]);
  const [combo, setCombo] = useState<ComboConfig | null>(null);
  const [kitAccessories, setKitAccessories] = useState<RelatedProduct[]>([]);
  const [selectedKitIds, setSelectedKitIds] = useState<Record<string, boolean>>({});
  const [kitLoading, setKitLoading] = useState(false);
  const [viewers] = useState(() => 3 + Math.floor(Math.random() * 5));

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data: p } = await supabase
          .from("produtos")
          .select("id, nome, slug, descricao, preco, preco_promocional, imagem_principal, material, categoria_id")
          .ilike("slug", slug)
          .maybeSingle();

        if (!p) {
          if (alive) setProduto(null);
          return;
        }

        const [{ data: imgs }, { data: vars }] = await Promise.all([
          supabase
            .from("imagens_produto")
            .select("url_storage, ordem")
            .eq("produto_id", p.id)
            .order("ordem", { ascending: true }),
          supabase
            .from("variantes_produto")
            .select("comprimento, estoque")
            .eq("produto_id", p.id),
        ]);
        const imagens = (imgs ?? []).map((i: any) => i.url_storage).filter(Boolean);
        if (p.imagem_principal && !imagens.includes(p.imagem_principal)) {
          imagens.unshift(p.imagem_principal);
        }
        if (!alive) return;
        setVariantes((vars ?? []) as { comprimento: string; estoque: number }[]);
        setProduto({
          id: p.id, nome: p.nome, slug: p.slug,
          descricao: p.descricao, preco: Number(p.preco),
          preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : null,
          imagem_principal: p.imagem_principal, material: p.material,
          categoria_id: p.categoria_id ?? null,
          imagens: imagens.length ? imagens : [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER],
        });

        // Carrega configuração do combo "Combine e Ganhe"
        const { data: cfg } = await supabase
          .from("combo_settings")
          .select("ativo, desconto, titulo, produto_id")
          .eq("id", 1)
          .maybeSingle();

        if (cfg && cfg.ativo && cfg.produto_id && cfg.produto_id !== p.id) {
          const { data: cp } = await supabase
            .from("produtos")
            .select("id, nome, slug, preco, preco_promocional, imagem_principal")
            .eq("id", cfg.produto_id)
            .maybeSingle();
          if (alive) {
            setCombo({
              ativo: true,
              desconto: Number(cfg.desconto ?? 0),
              titulo: cfg.titulo ?? "Combine e Ganhe Desconto",
              produto: cp
                ? {
                    id: cp.id, nome: cp.nome, slug: cp.slug,
                    preco: Number(cp.preco),
                    preco_promocional: cp.preco_promocional ? Number(cp.preco_promocional) : null,
                    imagem: cp.imagem_principal,
                  }
                : null,
            });
          }
        } else if (alive) {
          setCombo(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (!produto) return;
    let alive = true;
    setKitLoading(true);

    (async () => {
      const accessories: RelatedProduct[] = [];
      if (combo?.produto) {
        accessories.push({
          id: combo.produto.id,
          nome: combo.produto.nome,
          slug: combo.produto.slug,
          preco: combo.produto.preco,
          preco_promocional: combo.produto.preco_promocional,
          imagem: combo.produto.imagem,
        });
      }

      if (produto.categoria_id) {
        const { data: related } = await supabase
          .from("produtos")
          .select("id, nome, slug, preco, preco_promocional, imagem_principal")
          .eq("categoria_id", produto.categoria_id)
          .neq("id", produto.id)
          .eq("ativo", true)
          .limit(2);

        if (alive && related?.length) {
          for (const item of related) {
            if (!accessories.some((a) => a.id === item.id)) {
              accessories.push({
                id: item.id,
                nome: item.nome,
                slug: item.slug,
                preco: Number(item.preco),
                preco_promocional: item.preco_promocional ? Number(item.preco_promocional) : null,
                imagem: item.imagem_principal,
              });
            }
          }
        }
      }

      if (alive) {
        setKitAccessories(accessories);
        setSelectedKitIds(accessories.reduce((acc, item) => {
          acc[item.id] = false;
          return acc;
        }, {} as Record<string, boolean>));
        setKitLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [produto?.id, produto?.categoria_id, combo?.produto?.id]);

  const varMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of variantes) m.set(v.comprimento, v.estoque);
    return m;
  }, [variantes]);

  const stockRemaining = comprimento ? varMap.get(comprimento) ?? null : null;
  const showScarcityText = stockRemaining !== null && stockRemaining <= 5;
  const kitDiscount = combo?.desconto ?? 25;
  const kitSelectedAll = kitAccessories.length > 0 && kitAccessories.every((item) => selectedKitIds[item.id]);
  const selectedAccessories = kitAccessories.filter((item) => selectedKitIds[item.id]);

  const precoFinal = produto ? effectivePrice(produto.preco, produto.preco_promocional) : 0;
  const desconto = produto ? discountPct(produto.preco, produto.preco_promocional) : null;

  function handleAdd() {
    if (!produto) return;
    if (!comprimento) {
      toast.error("Por favor, selecione um comprimento antes de adicionar ao carrinho");
      return;
    }
    cart.add({
      produto_id: produto.id,
      variante_id: `${produto.id}-${comprimento}`,
      nome: produto.nome,
      slug: produto.slug,
      comprimento,
      preco_unit: precoFinal,
      preco_original: produto.preco,
      imagem: produto.imagens[0] ?? PLACEHOLDER,
      quantidade: 1,
    });
    toast.success(`${produto.nome} (${comprimento}) adicionado ao carrinho`);
    cartDrawer.open();
  }

  function handleExpressBuy() {
    if (!produto) return;
    if (!comprimento) {
      toast.error("Selecione um comprimento para usar o checkout expresso.");
      return;
    }
    cart.add({
      produto_id: produto.id,
      variante_id: `${produto.id}-${comprimento}`,
      nome: produto.nome,
      slug: produto.slug,
      comprimento,
      preco_unit: precoFinal,
      preco_original: produto.preco,
      imagem: produto.imagens[0] ?? PLACEHOLDER,
      quantidade: 1,
    });
    navigate({ to: "/checkout" });
  }

  function toggleKitAccessory(id: string) {
    setSelectedKitIds((current) => ({ ...current, [id]: !current[id] }));
  }

  function handleBuyKit() {
    if (!produto) return;
    if (!comprimento) {
      toast.error("Selecione um comprimento antes de comprar o kit.");
      return;
    }

    const mainKitVariantId = `${produto.id}-${comprimento}-kit`;
    const mainKitPrice = kitSelectedAll ? Math.max(0, precoFinal - kitDiscount) : precoFinal;
    cart.add({
      produto_id: produto.id,
      variante_id: mainKitVariantId,
      nome: `${produto.nome} ${kitSelectedAll ? "(Kit Completo)" : "(Kit Parcial)"}`,
      slug: produto.slug,
      comprimento,
      preco_unit: mainKitPrice,
      preco_original: produto.preco,
      imagem: produto.imagens[0] ?? PLACEHOLDER,
      quantidade: 1,
    });

    selectedAccessories.forEach((accessory) => {
      cart.add({
        produto_id: accessory.id,
        variante_id: `kit-${accessory.id}`,
        nome: accessory.nome,
        slug: accessory.slug,
        comprimento: "único",
        preco_unit: effectivePrice(accessory.preco, accessory.preco_promocional),
        preco_original: accessory.preco,
        imagem: accessory.imagem ?? PLACEHOLDER,
        quantidade: 1,
      });
    });

    toast.success(
      kitSelectedAll
        ? "Kit completo adicionado! Siga direto para o checkout."
        : "Itens do kit adicionados ao carrinho. Continue para finalizar.",
    );
    navigate({ to: "/checkout" });
  }

  const imagens = produto?.imagens ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-10 lg:py-16">
        <nav className="mb-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <Link to="/" className="hover:text-gold">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{produto?.nome ?? "Produto"}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Carrossel */}
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-neutral-900 to-black">
              <div className="aspect-square">
                <img
                  src={imagens[imgIdx] ?? PLACEHOLDER}
                  alt={produto?.nome ?? "Produto"}
                  className="h-full w-full object-cover"
                />
              </div>
              {imagens.length > 1 && (
                <>
                  <button
                    aria-label="Anterior"
                    onClick={() => setImgIdx((i) => (i - 1 + imagens.length) % imagens.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/70 p-2 backdrop-blur-md transition hover:bg-background"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    aria-label="Próximo"
                    onClick={() => setImgIdx((i) => (i + 1) % imagens.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/70 p-2 backdrop-blur-md transition hover:bg-background"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}
              {desconto && (
                <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-foreground">
                  -{desconto}%
                </span>
              )}
            </div>
            {imagens.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {imagens.slice(0, 5).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`aspect-square overflow-hidden rounded-lg border transition ${
                      i === imgIdx ? "border-gold" : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes */}
          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">PLATINUM 316L</p>
            <h1 className="mt-2 font-display text-3xl text-foreground lg:text-4xl">
              {loading ? "Carregando..." : produto?.nome}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {produto?.descricao}
            </p>

            <div className="mt-6 flex items-end gap-3">
              {produto?.preco_promocional && produto.preco_promocional < produto.preco && (
                <span className="text-base text-muted-foreground line-through">{brl(produto.preco)}</span>
              )}
              <span className="font-display text-3xl text-gold">{brl(precoFinal)}</span>
              {desconto && (
                <span className="rounded-md bg-gold/15 px-2 py-1 text-xs font-semibold text-gold">
                  Economize {desconto}%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              em até 12x sem juros · ou {brl(precoFinal * 0.9)} no Pix
            </p>

            {/* Comprimentos */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium uppercase tracking-wider text-foreground">
                  Comprimento <span className="text-destructive">*</span>
                </p>
                {comprimento && (
                  <span className="text-xs text-muted-foreground">Selecionado: {comprimento}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {COMPRIMENTOS.map((c) => {
                  const active = comprimento === c;
                  const estoque = varMap.get(c);
                  const disponivel = estoque !== undefined && estoque > 0;
                  return (
                    <button
                      key={c}
                      onClick={() => disponivel && setComprimento(c)}
                      disabled={!disponivel}
                      title={disponivel ? `${estoque} em estoque` : "Indisponível"}
                      className={`min-w-[68px] rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                        !disponivel
                          ? "cursor-not-allowed border-border/40 bg-card/40 text-muted-foreground/50 line-through"
                          : active
                          ? "border-gold bg-gold text-gold-foreground shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold)_25%,transparent)]"
                          : "border-border bg-card text-foreground hover:border-gold/60 hover:text-gold"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
                {!loading && varMap.size === 0 && (
                  <span className="text-xs text-muted-foreground">Nenhum tamanho cadastrado para este produto.</span>
                )}
              </div>


              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2 text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:border-gold hover:text-gold"
                >
                  <Ruler className="size-3.5" /> 📏 Guia de Tamanhos
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={handleAdd}
                className="h-14 flex-1 bg-gold text-gold-foreground text-sm uppercase tracking-[0.25em] shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--gold)_60%,transparent)] hover:bg-gold/90"
              >
                <ShoppingBag className="size-5" /> Adicionar ao Carrinho
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleExpressBuy}
                className="h-14 flex-1 border-gold bg-background text-gold text-sm uppercase tracking-[0.25em] shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--gold)_20%,transparent)] hover:bg-gold/5"
              >
                Comprar Agora
              </Button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {showScarcityText && (
                <p className="text-sm text-red-300">🔥 Restam apenas {stockRemaining} unidades deste produto!</p>
              )}
              <p className="text-xs text-muted-foreground">
                👁️ {viewers} pessoas estão olhando este produto agora
              </p>
            </div>

            {kitAccessories.length > 0 && (
              <div className="mt-8 rounded-2xl border border-border bg-card/80 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gold">Monte seu Kit Elite</p>
                    <h2 className="mt-2 text-xl font-display text-foreground">Estilo Completo</h2>
                  </div>
                  <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                    Economize {brl(kitDiscount)}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-background/80 p-4">
                    <div className="flex items-center gap-3">
                      <div className="aspect-square h-14 w-14 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-neutral-900 to-black">
                        <img src={produto?.imagens[0] ?? PLACEHOLDER} alt={produto?.nome ?? "Produto"} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{produto?.nome}</p>
                        <p className="text-xs text-muted-foreground">Produto principal incluído</p>
                      </div>
                      <span className="ml-auto rounded-full bg-platinum/10 px-2 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Incluído
                      </span>
                    </div>
                  </div>

                  {kitLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando sugestões do kit...</p>
                  ) : (
                    <div className="space-y-3">
                      {kitAccessories.map((accessory) => {
                        const precoAcessorio = effectivePrice(accessory.preco, accessory.preco_promocional);
                        return (
                          <label key={accessory.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background/70 p-4 transition hover:border-gold/40">
                            <Checkbox
                              checked={Boolean(selectedKitIds[accessory.id])}
                              onCheckedChange={() => toggleKitAccessory(accessory.id)}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{accessory.nome}</p>
                              <p className="text-xs text-muted-foreground">Use o kit completo para combinar com sua corrente.</p>
                            </div>
                            <div className="text-right text-sm">
                              {accessory.preco_promocional ? (
                                <div className="text-xs text-muted-foreground line-through">{brl(accessory.preco)}</div>
                              ) : null}
                              <div className="font-semibold text-gold">{brl(precoAcessorio)}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={handleBuyKit}
                      className="h-14 flex-1 bg-gold text-gold-foreground text-sm uppercase tracking-[0.25em] shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--gold)_60%,transparent)] hover:bg-gold/90"
                    >
                      {kitSelectedAll ? "Comprar Kit Completo" : "Adicionar Kit ao Carrinho"}
                    </Button>
                    <div className="flex-1 rounded-2xl border border-border bg-background/90 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{kitSelectedAll ? "Kit completo selecionado" : "Marque todos para ganhar desconto"}</p>
                      <p className="mt-1">Selecione todos os itens e receba desconto automático no seu combo.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {produto && combo?.ativo && combo.produto && (
              <ComboUpsell
                produto={produto}
                comprimento={comprimento}
                precoFinal={precoFinal}
                combo={combo}
                temVariantes={variantes.length > 0}
              />
            )}

            <div className="mt-8 grid grid-cols-1 gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" /> Aço 316L hipoalergênico, garantia anti-oxidação</div>
              <div className="flex items-center gap-2"><Truck className="size-4 text-gold" /> Frete grátis acima de R$ 299 · Envio em 24h</div>
            </div>
          </div>
        </div>
      </div>

      <GuiaTamanhosModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      <Footer />
    </div>
  );
}

function prettify(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ---------- Combo / Upsell ---------- */

function ComboUpsell({
  produto,
  comprimento,
  precoFinal,
  combo,
  temVariantes,
}: {
  produto: ProdutoData;
  comprimento: string | null;
  precoFinal: number;
  combo: ComboConfig;
  temVariantes: boolean;
}) {
  const comboProd = combo.produto!;
  const comboImg = comboProd.imagem ?? PLACEHOLDER;
  const comboPreco = effectivePrice(comboProd.preco, comboProd.preco_promocional);
  const desc = Math.max(0, Number(combo.desconto) || 0);
  const totalSem = precoFinal + comboPreco;
  const totalCom = Math.max(0, totalSem - desc);

  function adicionarCombo() {
    if (temVariantes && !comprimento) {
      toast.error("Selecione um comprimento antes de adicionar o combo");
      return;
    }
    const precoPrincipalComDesc = Math.max(0, precoFinal - desc);
    const sufixo = comprimento ?? "único";
    cart.add({
      produto_id: produto.id,
      variante_id: `${produto.id}-${sufixo}-combo`,
      nome: `${produto.nome} (Combo)`,
      slug: produto.slug,
      comprimento: sufixo,
      preco_unit: precoPrincipalComDesc,
      preco_original: produto.preco,
      imagem: produto.imagens[0] ?? PLACEHOLDER,
      quantidade: 1,
    });
    cart.add({
      produto_id: comboProd.id,
      variante_id: `${comboProd.id}-combo`,
      nome: comboProd.nome,
      slug: comboProd.slug,
      comprimento: "único",
      preco_unit: comboPreco,
      preco_original: comboProd.preco,
      imagem: comboImg,
      quantidade: 1,
    });
    toast.success(`Combo adicionado! Você economizou ${brl(desc)}.`);
    cartDrawer.open();
  }

  return (
    <div className="mt-8 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-background to-background p-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔥</span>
        <h3 className="font-display text-lg text-foreground">{combo.titulo}</h3>
      </div>
      <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-card/60 p-3">
        <div className="aspect-square h-20 w-20 overflow-hidden rounded-lg border border-border bg-gradient-to-br from-neutral-900 to-black">
          <img src={comboImg} alt={comboProd.nome} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{comboProd.nome}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Leve este produto + {comboProd.nome} e ganhe{" "}
            <strong className="text-gold">{brl(desc)}</strong> de desconto automaticamente no carrinho.
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground line-through">{brl(totalSem)}</span>
            <span className="text-sm font-semibold text-gold">{brl(totalCom)}</span>
          </div>
        </div>
      </div>
      <Button
        onClick={adicionarCombo}
        variant="outline"
        size="sm"
        className="mt-4 w-full border-gold/60 bg-transparent text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-gold-foreground"
      >
        <ShoppingBag className="size-4" /> Adicionar Combo ao Carrinho
      </Button>
    </div>
  );
}


/* ---------- Guia de Tamanhos Modal ---------- */

function GuiaTamanhosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl border-border bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-foreground">
            Encontre o Caimento Perfeito
          </DialogTitle>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Guia PLATINUM 316L</p>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="flex items-center justify-center rounded-xl border border-border bg-gradient-to-b from-neutral-900 to-black p-4">
            <SilhuetaSVG />
          </div>

          <div className="space-y-2">
            <table className="w-full text-sm">
              <tbody>
                {GUIDE_ROWS.map((r) => (
                  <tr key={r.size} className="border-b border-border/60 last:border-0">
                    <td className="w-16 py-2.5 pr-3 align-top font-display text-gold">{r.size}</td>
                    <td className="py-2.5 text-muted-foreground">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs text-foreground">
              <strong className="text-gold">Dica:</strong> Use um cordão em casa para medir em volta do seu pescoço e escolher a altura exata que você prefere.
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-full border border-border bg-background/70 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

function SilhuetaSVG() {
  // Coordinates calibrated for a torso. Each line corresponds to a chain length.
  const rows: { size: string; y: number }[] = [
    { size: "50", y: 92 },
    { size: "55", y: 110 },
    { size: "60", y: 130 },
    { size: "65", y: 152 },
    { size: "70", y: 176 },
    { size: "75", y: 200 },
    { size: "80", y: 222 },
  ];
  return (
    <svg viewBox="0 0 260 320" className="h-[320px] w-auto" fill="none">
      {/* Head */}
      <circle cx="130" cy="45" r="26" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* Neck */}
      <path d="M118 70 L118 86 Q130 92 142 86 L142 70" stroke="#e5e7eb" strokeWidth="1.5" />
      {/* Shoulders + torso */}
      <path
        d="M60 100 Q90 88 118 86 Q130 95 142 86 Q170 88 200 100 L210 140 L196 300 L150 300 L142 200 L118 200 L110 300 L64 300 L50 140 Z"
        stroke="#e5e7eb"
        strokeWidth="1.5"
      />
      {/* Chain length lines */}
      {rows.map((r, i) => {
        const half = Math.min(70 + i * 6, 95);
        return (
          <g key={r.size}>
            <line
              x1={130 - half}
              x2={130 + half}
              y1={r.y}
              y2={r.y}
              stroke="oklch(0.78 0.12 85)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.85"
            />
            <text
              x={130 + half + 6}
              y={r.y + 3}
              fontSize="10"
              fill="oklch(0.78 0.12 85)"
              fontFamily="serif"
            >
              {r.size}cm
            </text>
          </g>
        );
      })}
    </svg>
  );
}
