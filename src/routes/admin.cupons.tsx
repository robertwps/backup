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
  const [referralActive, setReferralActive] = useState(true);
  const [referralBonus, setReferralBonus] = useState(20);
  const [referralLoading, setReferralLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setReferralLoading(true);
    try {
      const [{ data: cupomData }, { data: referralData }] = await Promise.all([
        supabase.from("cupons").select("*").order("criado_em", { ascending: false }),
        supabase.from("referral_settings").select("ativo, bonus_amount").eq("id", 1).maybeSingle(),
      ]);

      const arr = (cupomData ?? []) as any[];
      if (arr.length === 0) {
        const { mockCupons } = await import("@/lib/admin-mock");
        setItems(mockCupons as Cupom[]);
      } else {
        setItems(arr.map((c) => ({ ...c, valor: Number(c.valor) })));
      }

      if (referralData) {
        setReferralActive(Boolean(referralData.ativo));
        setReferralBonus(Number(referralData.bonus_amount ?? 20));
      }
    } catch (err) {
      console.error("[admin/cupons]", err);
      const { mockCupons } = await import("@/lib/admin-mock");
      setItems(mockCupons as Cupom[]);
    }
    setReferralLoading(false);
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

  const saveReferralConfig = async () => {
    if (referralBonus < 0) return toast.error("Valor inválido.");
    setReferralLoading(true);
    try {
      const { error } = await supabase.from("referral_settings").upsert({
        id: 1,
        ativo: referralActive,
        bonus_amount: referralBonus,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Configuração de indicação salva.");
    } catch (err) {
      console.error("[admin/cupons] referral settings", err);
      toast.error("Falha ao salvar configuração de indicação.");
    } finally {
      setReferralLoading(false);
    }
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

      <Card className="border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Programa de indicação</h2>
            <p className="text-sm text-muted-foreground">
              Configure o crédito liberado para o indicador quando um amigo fizer a primeira compra.
            </p>
          </div>
          <Button onClick={saveReferralConfig} disabled={referralLoading} className="bg-gold text-gold-foreground hover:bg-gold/90">
            {referralLoading ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Programa ativo</Label>
            <Switch checked={referralActive} onCheckedChange={setReferralActive} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Crédito por indicação (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={referralBonus}
              onChange={(e) => setReferralBonus(Number(e.target.value))}
            />
          </div>
        </div>
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
