import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/combo")({ component: AdminCombo });

type Produto = { id: string; nome: string; preco: number; preco_promocional: number | null; imagem_principal: string | null };

function AdminCombo() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [desconto, setDesconto] = useState<number>(15);
  const [ativo, setAtivo] = useState<boolean>(false);
  const [titulo, setTitulo] = useState<string>("Combine e Ganhe Desconto");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: ps }, { data: cfg }] = await Promise.all([
          supabase.from("produtos").select("id, nome, preco, preco_promocional, imagem_principal").eq("ativo", true).order("nome"),
          supabase.from("combo_settings").select("*").eq("id", 1).maybeSingle(),
        ]);
        setProdutos((ps ?? []) as Produto[]);
        if (cfg) {
          setProdutoId(cfg.produto_id);
          setDesconto(Number(cfg.desconto ?? 15));
          setAtivo(!!cfg.ativo);
          setTitulo(cfg.titulo ?? "Combine e Ganhe Desconto");
        }
      } catch (err) {
        console.error("[admin/combo] load", err);
        toast.error("Falha ao carregar configurações.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (ativo && !produtoId) return toast.error("Selecione um produto para o combo.");
    if (desconto < 0) return toast.error("Desconto inválido.");
    setSaving(true);
    try {
      const { error } = await supabase.from("combo_settings").upsert({
        id: 1,
        produto_id: produtoId,
        desconto,
        ativo,
        titulo: titulo.trim() || "Combine e Ganhe Desconto",
        atualizado_em: new Date().toISOString(),
      });
      if (error) {
        console.error("[admin/combo] save", error);
        toast.error(`Falha ao salvar: ${error.message}`);
      } else {
        toast.success("Configuração do combo salva. Já aparece em todos os produtos.");
      }
    } finally {
      setSaving(false);
    }
  };

  const selecionado = produtos.find((p) => p.id === produtoId);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin text-indigo-400" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl text-white flex items-center gap-2"><Sparkles className="size-7 text-amber-400" /> Combine e Ganhe</h1>
        <p className="text-sm text-slate-400 mt-1">Configure o produto exibido como combo em <strong>todas</strong> as páginas de produtos da loja.</p>
      </div>

      <Card className="border-slate-800 bg-slate-900 p-6 space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div>
            <Label className="text-slate-200">Exibir combo na loja</Label>
            <p className="text-xs text-slate-500 mt-1">Quando ativo, aparece em todas as páginas de produtos (exceto na do próprio produto do combo).</p>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>

        <div>
          <Label className="text-slate-300">Título do bloco</Label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="border-slate-700 bg-slate-950 text-slate-100 mt-1"
            placeholder="Combine e Ganhe Desconto"
          />
        </div>

        <div>
          <Label className="text-slate-300">Produto do combo</Label>
          <Select value={produtoId ?? ""} onValueChange={(v) => setProdutoId(v || null)}>
            <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100 mt-1">
              <SelectValue placeholder="Selecione um produto..." />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome} — {brl(Number(p.preco_promocional ?? p.preco))}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">Cadastre o produto antes em <strong>Produtos</strong> e selecione aqui.</p>
        </div>

        {selecionado && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            {selecionado.imagem_principal ? (
              <img src={selecionado.imagem_principal} alt={selecionado.nome} className="size-16 rounded-md object-cover" />
            ) : (
              <div className="size-16 rounded-md bg-slate-800" />
            )}
            <div>
              <p className="text-sm font-medium text-white">{selecionado.nome}</p>
              <p className="text-xs text-slate-400">{brl(Number(selecionado.preco_promocional ?? selecionado.preco))}</p>
            </div>
          </div>
        )}

        <div>
          <Label className="text-slate-300">Desconto do combo (R$)</Label>
          <Input
            type="number" min={0} step={0.01}
            value={desconto}
            onChange={(e) => setDesconto(Number(e.target.value))}
            className="border-slate-700 bg-slate-950 text-slate-100 mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">Valor abatido automaticamente quando o cliente compra o combo.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} className="bg-indigo-500 text-white hover:bg-indigo-400">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Salvar configuração
          </Button>
        </div>
      </Card>
    </div>
  );
}
