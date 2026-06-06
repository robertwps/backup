import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus, Loader2, UploadCloud, X, ImageIcon, Search } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/produtos")({ component: AdminProdutos });

const COMPRIMENTOS = ["50cm", "55cm", "60cm", "65cm", "70cm", "75cm", "80cm"];
const MAX_IMAGES = 3;

const isValidImageCount = (count: number) => count === 1 || count === 3;

async function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = 30000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} demorou demais para responder. Tente novamente.`));
    }, ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise as Promise<T>]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

type Produto = {
  id: string; nome: string; slug: string; descricao: string | null;
  preco: number; preco_promocional: number | null; preco_custo: number;
  categoria_id: string | null; sku: string | null; estoque_minimo: number;
  ativo: boolean; destaque: boolean; imagem_principal: string | null; imagem_url?: string | null; material: string;
};
type Categoria = { id: string; nome: string };

const genSku = () => "SKU-" + Math.random().toString(36).slice(2, 10).toUpperCase();

function AdminProdutos() {
  const [items, setItems] = useState<Produto[]>([]);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [estoqueMap, setEstoqueMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pr, ct, vs] = await Promise.all([
        supabase.from("produtos").select("*").order("criado_em", { ascending: false }),
        supabase.from("categorias").select("id, nome").order("nome"),
        supabase.from("variantes_produto").select("produto_id, estoque"),
      ]);
      const map: Record<string, number> = {};
      (vs.data ?? []).forEach((v: any) => {
        map[v.produto_id] = (map[v.produto_id] ?? 0) + Number(v.estoque ?? 0);
      });
      const produtos = (pr.data ?? []) as Produto[];
      const categorias = (ct.data ?? []) as Categoria[];
      if (produtos.length === 0) {
        const { mockProdutos, mockCategorias, mockEstoqueMap } = await import("@/lib/admin-mock");
        setItems(mockProdutos as Produto[]);
        setCats((categorias.length ? categorias : (mockCategorias as Categoria[])));
        setEstoqueMap(mockEstoqueMap);
        setUsingMock(true);
      } else {
        setItems(produtos);
        setCats(categorias);
        setEstoqueMap(map);
        setUsingMock(false);
      }
    } catch (err) {
      console.error("[admin/produtos]", err);
      const { mockProdutos, mockCategorias, mockEstoqueMap } = await import("@/lib/admin-mock");
      setItems(mockProdutos as Produto[]); setCats(mockCategorias as Categoria[]);
      setEstoqueMap(mockEstoqueMap); setUsingMock(true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (p: Produto) => {
    if (p.id.startsWith("mock-")) { setItems((prev) => prev.filter((x) => x.id !== p.id)); return toast.success("Produto fictício removido."); }
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    await supabase.from("imagens_produto").delete().eq("produto_id", p.id);
    await supabase.from("variantes_produto").delete().eq("produto_id", p.id);
    const { error } = await supabase.from("produtos").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Produto removido."); load();
  };

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return p.nome.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Produtos</h1>
          <p className="text-sm text-slate-400">{items.length} cadastrados {usingMock && <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase text-amber-300">demo</span>}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-indigo-500 text-white hover:bg-indigo-400">
          <Plus className="mr-2 size-4" /> Novo produto
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Buscar por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-slate-800 bg-slate-900 pl-10 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <Card className="overflow-hidden border-slate-800 bg-slate-900">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin text-indigo-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Nenhum produto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Foto</th>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Preço</th>
                  <th className="px-4 py-3 text-left">Estoque</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((p) => {
                  const estoque = estoqueMap[p.id] ?? 0;
                  const baixo = estoque < (p.estoque_minimo ?? 5);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        {p.imagem_principal ? (
                          <img src={p.imagem_principal} alt={p.nome} className="size-12 rounded-md object-cover" />
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-md bg-slate-800 text-slate-600"><ImageIcon className="size-5" /></div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{p.nome}</div>
                        <div className="text-xs text-slate-500">{p.destaque && "Destaque · "}{p.material}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{p.sku ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-200">{brl(Number(p.preco_promocional ?? p.preco))}</td>
                      <td className="px-4 py-3 text-slate-200">{estoque}</td>
                      <td className="px-4 py-3">
                        {baixo ? (
                          <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-300 ring-1 ring-rose-500/30">Estoque Baixo</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">Estoque Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800 hover:text-indigo-300" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800 hover:text-rose-400" onClick={() => onDelete(p)}><Trash2 className="size-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ProdutoDialog open={open} onOpenChange={setOpen} produto={editing} categorias={cats} onSaved={() => { setOpen(false); load(); }} />
    </div>
  );
}

type VarianteForm = { comprimento: string; estoque: number; enabled: boolean };

function ProdutoDialog({ open, onOpenChange, produto, categorias, onSaved }: { open: boolean; onOpenChange: (b: boolean) => void; produto: Produto | null; categorias: Categoria[]; onSaved: () => void }) {
  const empty: Produto = { id: "", nome: "", slug: "", descricao: "", preco: 0, preco_promocional: null, preco_custo: 0, categoria_id: null, sku: null, estoque_minimo: 5, ativo: true, destaque: false, imagem_principal: null, material: "Aço Inoxidável 316L" };
  const [form, setForm] = useState<Produto>(produto ?? empty);
  const [variantes, setVariantes] = useState<VarianteForm[]>(COMPRIMENTOS.map((c) => ({ comprimento: c, estoque: 0, enabled: false })));
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; url_storage: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(produto ?? { ...empty, sku: genSku() });
    setFiles([]);
    if (produto?.id) {
      (async () => {
        const [{ data: vs }, { data: imgs }] = await Promise.all([
          supabase.from("variantes_produto").select("comprimento, estoque").eq("produto_id", produto.id),
          supabase.from("imagens_produto").select("id, url_storage").eq("produto_id", produto.id).order("ordem"),
        ]);
        const map = new Map((vs ?? []).map((v: any) => [v.comprimento, v.estoque]));
        setVariantes(COMPRIMENTOS.map((c) => ({ comprimento: c, estoque: Number(map.get(c) ?? 0), enabled: map.has(c) })));
        setExistingImages((imgs ?? []) as any);
      })();
    } else {
      setVariantes(COMPRIMENTOS.map((c) => ({ comprimento: c, estoque: 0, enabled: false })));
      setExistingImages([]);
    }
  }, [produto, open]);

  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const lucratividade = useMemo(() => {
    const venda = Number(form.preco_promocional ?? form.preco) || 0;
    const custo = Number(form.preco_custo) || 0;
    if (custo <= 0 || venda <= 0) return 0;
    return ((venda - custo) / custo) * 100;
  }, [form.preco, form.preco_promocional, form.preco_custo]);

  const estoqueAtual = useMemo(
    () => variantes.filter((v) => v.enabled).reduce((s, v) => s + Number(v.estoque || 0), 0),
    [variantes]
  );

  const handleFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const remaining = MAX_IMAGES - existingImages.length - files.length;

    if (remaining <= 0) {
      toast.error("Máximo de 3 imagens.");
      return;
    }

    if (arr.length === 0) {
      toast.error("Selecione arquivos de imagem válidos.");
      return;
    }

    if (arr.length > remaining) {
      toast.error(`Você pode adicionar apenas mais ${remaining} imagem(ns).`);
    }

    setFiles((prev) => [...prev, ...arr.slice(0, remaining)]);
  }, [existingImages.length, files.length]);

  const save = async () => {
    if (saving) return;
    if (!form.nome.trim()) return toast.error("Nome obrigatório.");
    if (!form.categoria_id) return toast.error("Selecione uma categoria.");
    if (form.preco <= 0) return toast.error("Preço de venda inválido.");
    const totalImgs = existingImages.length + files.length;
    if (!isValidImageCount(totalImgs)) return toast.error("Envie 1 ou 3 imagens.");

    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.nome);
      const sku = (form.sku ?? "").trim() || genSku();
      const payload: any = {
        nome: form.nome.trim(), slug, descricao: form.descricao, preco: form.preco,
        preco_promocional: form.preco_promocional, preco_custo: form.preco_custo,
        categoria_id: form.categoria_id, sku, estoque_minimo: form.estoque_minimo,
        ativo: form.ativo, destaque: form.destaque, material: form.material,
        imagem_principal: form.imagem_principal,
        imagem_url: form.imagem_url ?? form.imagem_principal,
      };
      let produtoId = form.id;
      if (produtoId) {
        const { error } = await withTimeout(
          supabase.from("produtos").update(payload).eq("id", produtoId),
          "A atualização do produto",
        );
        if (error) {
          console.error("[produtos] update", error);
          toast.error(`Falha ao atualizar: ${error.message}`);
          return;
        }
      } else {
        const { data, error } = await withTimeout(
          supabase.from("produtos").insert(payload).select("id").single(),
          "O cadastro do produto",
        );
        if (error || !data) {
          console.error("[produtos] insert", error);
          const msg = error?.message ?? "Erro desconhecido ao cadastrar.";
          if ((error as any)?.code === "23505") {
            toast.error("Já existe um produto com esse slug ou SKU. Altere e tente novamente.");
          } else {
            toast.error(`Falha ao cadastrar: ${msg}`);
          }
          return;
        }
        produtoId = data.id;
      }

      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${produtoId}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await withTimeout(
          supabase.storage.from("products").upload(path, file, { upsert: false, contentType: file.type }),
          `O upload da imagem ${i + 1}`,
          45000,
        );
        if (upErr) {
          console.error("[produtos] upload", upErr);
          toast.error("Upload falhou: " + upErr.message);
          return;
        }
        const { data: pub } = supabase.storage.from("products").getPublicUrl(path);
        uploadedUrls.push(pub.publicUrl);
      }
      if (uploadedUrls.length) {
        const primaryImageUrl = existingImages[0]?.url_storage ?? uploadedUrls[0];
        const startOrder = existingImages.length;
        const rows = uploadedUrls.map((url, i) => ({ produto_id: produtoId, url_storage: url, ordem: startOrder + i + 1 }));
        const { error: imgErr } = await withTimeout(
          supabase.from("imagens_produto").insert(rows),
          "O vínculo das imagens do produto",
        );
        if (imgErr) {
          console.error("[produtos] imagens_produto insert", imgErr);
          throw new Error(`Falha ao registrar as imagens: ${imgErr.message}`);
        }

        const { error: updErr } = await withTimeout(
          supabase
            .from("produtos")
            .update({ imagem_principal: primaryImageUrl, imagem_url: primaryImageUrl })
            .eq("id", produtoId),
          "A atualização da imagem principal",
        );
        if (updErr) {
          console.error("[produtos] update imagem_principal", updErr);
          throw new Error(`Falha ao atualizar a imagem principal: ${updErr.message}`);
        }
      }

      const { error: delVarErr } = await withTimeout(
        supabase.from("variantes_produto").delete().eq("produto_id", produtoId),
        "A atualização das variantes",
      );
      if (delVarErr) {
        console.error("[produtos] delete variantes", delVarErr);
        throw new Error(`Falha ao limpar variantes antigas: ${delVarErr.message}`);
      }

      const enabledVs = variantes.filter((v) => v.enabled).map((v) => ({ produto_id: produtoId, comprimento: v.comprimento, estoque: v.estoque }));
      if (enabledVs.length) {
        const { error: insVarErr } = await withTimeout(
          supabase.from("variantes_produto").insert(enabledVs),
          "O salvamento das variantes",
        );
        if (insVarErr) {
          console.error("[produtos] insert variantes", insVarErr);
          throw new Error(`Falha ao salvar variantes: ${insVarErr.message}`);
        }
      }

      toast.success("Produto salvo.");
      onSaved();
    } catch (err: any) {
      console.error("[produtos] save exception", err);
      toast.error(`Erro inesperado: ${err?.message ?? String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const removeFile = (idx: number) => setFiles((p) => p.filter((_, i) => i !== idx));
  const removeExisting = async (id: string) => {
    await supabase.from("imagens_produto").delete().eq("id", id);
    setExistingImages((p) => p.filter((x) => x.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-900 text-slate-100 sm:max-w-2xl">
        <DialogHeader><DialogTitle className="text-white">{form.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-slate-300">Nome do Produto</Label>
              <Input className="border-slate-700 bg-slate-950 text-slate-100" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value, slug: form.slug || slugify(e.target.value) })} />
            </div>
            <div>
              <Label className="text-slate-300">SKU</Label>
              <div className="flex gap-2">
                <Input className="border-slate-700 bg-slate-950 font-mono text-slate-100" value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-gerado" />
                <Button type="button" variant="outline" className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800" onClick={() => setForm({ ...form, sku: genSku() })}>Gerar</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-slate-300">Categoria</Label>
              <Select value={form.categoria_id ?? ""} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                <SelectTrigger className="border-slate-700 bg-slate-950 text-slate-100"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Material</Label>
              <Input className="border-slate-700 bg-slate-950 text-slate-100" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Descrição</Label>
            <Textarea rows={3} className="border-slate-700 bg-slate-950 text-slate-100" value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label className="text-slate-300">Preço de Custo</Label>
              <Input type="number" step="0.01" className="border-slate-700 bg-slate-950 text-slate-100" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-slate-300">Preço de Venda</Label>
              <Input type="number" step="0.01" className="border-slate-700 bg-slate-950 text-slate-100" value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-slate-300">Promocional</Label>
              <Input type="number" step="0.01" className="border-slate-700 bg-slate-950 text-slate-100" value={form.preco_promocional ?? ""} onChange={(e) => setForm({ ...form, preco_promocional: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label className="text-slate-300">Lucratividade</Label>
              <div className={`flex h-10 items-center rounded-md border border-slate-700 bg-slate-950 px-3 font-semibold ${lucratividade >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {lucratividade.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-slate-300">Estoque Atual</Label>
              <div className="flex h-10 items-center rounded-md border border-slate-700 bg-slate-950 px-3 text-slate-100">
                {estoqueAtual} <span className="ml-2 text-xs text-slate-500">(soma das variantes)</span>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Estoque Mínimo</Label>
              <Input type="number" min={0} className="border-slate-700 bg-slate-950 text-slate-100" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-slate-300">Slug</Label>
              <Input className="border-slate-700 bg-slate-950 text-slate-100" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300"><Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} /> Ativo</label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><Switch checked={form.destaque} onCheckedChange={(v) => setForm({ ...form, destaque: v })} /> Destaque</label>
          </div>

          <div>
            <Label className="text-slate-300">Imagens (1 ou 3)</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              className={`mt-2 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-indigo-500/50"}`}
            >
              <UploadCloud className="mx-auto size-8 text-slate-500" />
              <p className="mt-2 text-sm text-slate-400">Arraste 1 ou 3 imagens, ou clique para selecionar</p>
              <p className="text-xs text-slate-500">{existingImages.length + files.length}/{MAX_IMAGES} enviadas</p>
              <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            </div>
            {(existingImages.length > 0 || files.length > 0) && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative">
                    <img src={img.url_storage} alt="" className="aspect-square w-full rounded object-cover" />
                    <button onClick={() => removeExisting(img.id)} className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white"><X className="size-3" /></button>
                  </div>
                ))}
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} alt="" className="aspect-square w-full rounded object-cover" />
                    <button onClick={() => removeFile(i)} className="absolute -right-2 -top-2 rounded-full bg-rose-500 p-1 text-white"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-slate-300">Estoque por comprimento (50 – 80 cm)</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {variantes.map((v, i) => (
                <div key={v.comprimento} className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950 p-2">
                  <Switch checked={v.enabled} onCheckedChange={(b) => setVariantes((p) => p.map((x, j) => j === i ? { ...x, enabled: b } : x))} />
                  <span className="w-12 text-sm font-medium text-slate-200">{v.comprimento}</span>
                  <Input type="number" min={0} disabled={!v.enabled} value={v.estoque} onChange={(e) => setVariantes((p) => p.map((x, j) => j === i ? { ...x, estoque: Number(e.target.value) } : x))} className="h-8 border-slate-700 bg-slate-900 text-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-indigo-500 text-white hover:bg-indigo-400">{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
