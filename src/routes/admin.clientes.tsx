import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, MapPin, ShoppingBag, Mail, Phone, Trash2 } from "lucide-react";
import { brl } from "@/lib/format";
import { excluirClienteAdmin } from "@/lib/admin-clientes.functions";

export const Route = createFileRoute("/admin/clientes")({ component: AdminClientes });

type Cliente = {
  id: string;
  nome_completo: string | null;
  email: string | null;
  telefone: string | null;
  criado_em: string;
};
type Endereco = {
  id: string;
  rua: string;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string;
  complemento: string | null;
};
type Pedido = { id: string; numero: number; total: number; status: string; criado_em: string };

function AdminClientes() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [toDelete, setToDelete] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("clientes")
          .select("*")
          .order("criado_em", { ascending: false });
        if (!data || data.length === 0) {
          const { mockClientes } = await import("@/lib/admin-mock");
          setItems(mockClientes as Cliente[]);
          setUsingMock(true);
        } else {
          setItems(data as Cliente[]);
        }
      } catch (err) {
        console.error("[admin/clientes]", err);
        const { mockClientes } = await import("@/lib/admin-mock");
        setItems(mockClientes as Cliente[]);
        setUsingMock(true);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (c) =>
        (c.nome_completo ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleConfirmDelete = async () => {
    if (!toDelete) return;
    if (usingMock) {
      setItems((prev) => prev.filter((c) => c.id !== toDelete.id));
      toast.success("Cliente removido (modo demo).");
      setToDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await excluirClienteAdmin({ data: { clienteId: toDelete.id } });
      setItems((prev) => prev.filter((c) => c.id !== toDelete.id));
      toast.success("Cliente excluído com sucesso.");
      setToDelete(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao excluir cliente.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Clientes</h1>
        <p className="text-sm text-muted-foreground">{items.length} cadastrados</p>
      </div>
      <Input
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card className="border-border bg-card">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="size-6 animate-spin text-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 p-4 transition-luxury hover:bg-background"
              >
                <button
                  onClick={() => setSelected(c)}
                  className="flex flex-1 items-center gap-4 text-left"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-gold/10 text-sm font-bold text-gold">
                    {(c.nome_completo ?? c.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.nome_completo ?? "(sem nome)"}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                  </div>
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setToDelete(c);
                  }}
                  aria-label={`Excluir ${c.nome_completo ?? c.email ?? "cliente"}`}
                  className="inline-flex size-9 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ClienteDialog cliente={selected} onClose={() => setSelected(null)} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                {toDelete?.nome_completo ?? toDelete?.email ?? "Cliente"}
              </span>{" "}
              será removido permanentemente. Endereços salvos serão apagados e os pedidos
              existentes continuarão no histórico, mas sem vínculo com a conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClienteDialog({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setLoading(true);
    (async () => {
      const [{ data: end }, { data: ped }] = await Promise.all([
        supabase.from("enderecos").select("*").eq("cliente_id", cliente.id),
        supabase
          .from("pedidos")
          .select("id, numero, total, status, criado_em")
          .eq("cliente_id", cliente.id)
          .order("criado_em", { ascending: false }),
      ]);
      setEnderecos((end ?? []) as Endereco[]);
      setPedidos(((ped ?? []) as any[]).map((p) => ({ ...p, total: Number(p.total) })));
      setLoading(false);
    })();
  }, [cliente]);

  return (
    <Dialog open={!!cliente} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cliente?.nome_completo ?? "Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-gold" /> {cliente?.email ?? "—"}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-gold" /> {cliente?.telefone ?? "—"}
            </div>
          </div>

          {loading ? (
            <Loader2 className="mx-auto size-5 animate-spin text-gold" />
          ) : (
            <>
              <section>
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg">
                  <MapPin className="size-4 text-gold" /> Endereços ({enderecos.length})
                </h3>
                {enderecos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem endereços cadastrados.</p>
                ) : (
                  <div className="space-y-2">
                    {enderecos.map((e) => (
                      <div key={e.id} className="rounded border border-border bg-background p-3 text-sm">
                        <div>
                          {e.rua}, {e.numero} {e.complemento && `- ${e.complemento}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.bairro} · {e.cidade}/{e.estado} · CEP {e.cep}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-2 flex items-center gap-2 font-display text-lg">
                  <ShoppingBag className="size-4 text-gold" /> Histórico ({pedidos.length})
                </h3>
                {pedidos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem pedidos.</p>
                ) : (
                  <div className="divide-y divide-border rounded border border-border">
                    {pedidos.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                        <div>
                          <div className="font-medium">#{p.numero}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gold">{brl(p.total)}</div>
                          <div className="text-xs uppercase tracking-widest text-muted-foreground">
                            {p.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
