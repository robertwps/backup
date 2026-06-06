import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mockCategorias, isMockId } from "@/lib/admin-mock";

export const Route = createFileRoute("/admin/categorias")({ component: AdminCategorias });

type Categoria = { id: string; nome: string; slug: string; descricao: string | null; imagem_url: string | null; ordem: number };

function AdminCategorias() {
  const [items, setItems] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("categorias").select("*").order("ordem", { ascending: true });
    if (error) {
      toast.error(error.message);
      setItems(mockCategorias as Categoria[]); setUsingMock(true);
    } else if (!data || data.length === 0) {
      setItems(mockCategorias as Categoria[]); setUsingMock(true);
    } else {
      setItems(data as Categoria[]); setUsingMock(false);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onNew = () => { setEditing({ id: "", nome: "", slug: "", descricao: "", imagem_url: "", ordem: items.length } as Categoria); setOpen(true); };
  const onEdit = (c: Categoria) => { setEditing(c); setOpen(true); };
  const onDelete = async (c: Categoria) => {
    if (isMockId(c.id)) { setItems((p) => p.filter((x) => x.id !== c.id)); return toast.success("Categoria fictícia removida."); }
    if (!confirm(`Excluir categoria "${c.nome}"?`)) return;
    const { error } = await supabase.from("categorias").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Categoria removida."); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Categorias</h1>
          <p className="text-sm text-muted-foreground">{items.length} cadastradas {usingMock && <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase text-amber-300">demo</span>}</p>
        </div>
        <Button onClick={onNew} className="bg-gold text-gold-foreground hover:bg-gold/90"><Plus className="mr-2 size-4" /> Nova categoria</Button>
      </div>

      <Card className="border-border bg-card">
        {loading ? <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin text-gold" /></div> :
          items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma categoria.</p> :
          <div className="divide-y divide-border">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-4">
                {c.imagem_url ? <img src={c.imagem_url} alt={c.nome} className="size-14 rounded object-cover" /> : <div className="size-14 rounded bg-background" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">/{c.slug}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onEdit(c)}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(c)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            ))}
          </div>}
      </Card>

      <CategoriaDialog open={open} onOpenChange={setOpen} value={editing} onSaved={() => { setOpen(false); load(); }} />
    </div>
  );
}

function CategoriaDialog({ open, onOpenChange, value, onSaved }: { open: boolean; onOpenChange: (b: boolean) => void; value: Categoria | null; onSaved: () => void }) {
  const [form, setForm] = useState<Categoria>(value ?? ({ id: "", nome: "", slug: "", descricao: "", imagem_url: "", ordem: 0 } as Categoria));
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (value) setForm(value); }, [value]);

  const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const save = async () => {
    if (!form.nome.trim()) return toast.error("Nome obrigatório.");
    const slug = form.slug.trim() || slugify(form.nome);
    setSaving(true);
    const payload = { nome: form.nome.trim(), slug, descricao: form.descricao, imagem_url: form.imagem_url, ordem: form.ordem };
    const { error } = form.id
      ? await supabase.from("categorias").update(payload).eq("id", form.id)
      : await supabase.from("categorias").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Categoria salva.");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle>{form.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value, slug: form.slug || slugify(e.target.value) })} /></div>
          <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
          <div><Label>Descrição</Label><Textarea rows={3} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div><Label>URL da imagem</Label><Input value={form.imagem_url ?? ""} onChange={(e) => setForm({ ...form, imagem_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>Ordem</Label><Input type="number" value={form.ordem} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-gold text-gold-foreground hover:bg-gold/90">{saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
