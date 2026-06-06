import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cupons")({ component: AdminCupons });

type Cupom = { id: string; codigo: string; tipo: string; valor: number; ativa: boolean; criado_em: string };

function AdminCupons() {
  const [items, setItems] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo: "", tipo: "percentual", valor: 10 });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("cupons").select("*").order("criado_em", { ascending: false });
      const arr = (data ?? []) as any[];
      if (arr.length === 0) {
        const { mockCupons } = await import("@/lib/admin-mock");
        setItems(mockCupons as Cupom[]);
      } else {
        setItems(arr.map((c) => ({ ...c, valor: Number(c.valor) })));
      }
    } catch (err) {
      console.error("[admin/cupons]", err);
      const { mockCupons } = await import("@/lib/admin-mock");
      setItems(mockCupons as Cupom[]);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.codigo.trim()) return toast.error("Código obrigatório.");
    if (form.valor <= 0) return toast.error("Valor inválido.");
    const { error } = await supabase.from("cupons").insert({ codigo: form.codigo.trim().toUpperCase(), tipo: form.tipo, valor: form.valor, ativa: true });
    if (error) return toast.error(error.message);
    toast.success("Cupom criado.");
    setOpen(false); setForm({ codigo: "", tipo: "percentual", valor: 10 }); load();
  };

  const toggle = async (c: Cupom) => {
    if (c.id.startsWith("mock-")) { setItems((p) => p.map((x) => x.id === c.id ? { ...x, ativa: !x.ativa } : x)); return; }
    await supabase.from("cupons").update({ ativa: !c.ativa }).eq("id", c.id);
    load();
  };
  const remove = async (c: Cupom) => {
    if (c.id.startsWith("mock-")) { setItems((p) => p.filter((x) => x.id !== c.id)); return; }
    if (!confirm(`Excluir cupom ${c.codigo}?`)) return;
    await supabase.from("cupons").delete().eq("id", c.id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-3xl">Cupons</h1><p className="text-sm text-muted-foreground">{items.length} cadastrados</p></div>
        <Button onClick={() => setOpen(true)} className="bg-gold text-gold-foreground hover:bg-gold/90"><Plus className="mr-2 size-4" /> Novo cupom</Button>
      </div>

      <Card className="border-border bg-card">
        {loading ? <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin text-gold" /></div> :
          items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhum cupom.</p> :
          <div className="divide-y divide-border">
            {items.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-lg font-bold tracking-wider text-gold">{c.codigo}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.tipo === "percentual" ? `${c.valor}% off` : `R$ ${c.valor.toFixed(2)} off`}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs"><Switch checked={c.ativa} onCheckedChange={() => toggle(c)} /> {c.ativa ? "Ativo" : "Inativo"}</div>
                <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            ))}
          </div>}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Novo cupom</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder="ELITE10" /></div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create} className="bg-gold text-gold-foreground hover:bg-gold/90">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
