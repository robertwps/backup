import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ProductCard, type ProductCardData } from "@/components/site/ProductCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/categoria/$slug")({
  component: CategoriaPage,
});

function CategoriaPage() {
  const { slug } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["categoria", slug],
    queryFn: async () => {
      const { data: cat } = await supabase.from("categorias").select("id, nome, slug").ilike("slug", slug).maybeSingle();
      if (!cat) return { cat: null, produtos: [] as ProductCardData[] };
      const { data: prods } = await supabase
        .from("produtos")
        .select("id, nome, slug, preco, preco_promocional, imagem_principal")
        .eq("categoria_id", cat.id)
        .eq("ativo", true)
        .order("criado_em", { ascending: false });
      const produtos: ProductCardData[] = (prods ?? []).map((p: any) => ({
        id: p.id, nome: p.nome, slug: p.slug,
        preco: Number(p.preco),
        preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : null,
        imagem: p.imagem_principal ?? "",
      }));
      return { cat, produtos };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Categoria</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">{data?.cat?.nome ?? "Carregando..."}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{data?.produtos.length ?? 0} produtos</p>

        {data && data.produtos.length === 0 && (
          <div className="mt-16 text-center text-muted-foreground">
            Nenhum produto encontrado. <Link to="/" className="text-gold underline">Voltar à home</Link>
          </div>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data?.produtos.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
      <Footer />
    </div>
  );
}
