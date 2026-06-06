import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  atualizarStatusPedidoAdmin,
  excluirPedidoAdmin,
  enviarRecuperacaoEmailAdmin,
  listarPedidosAdmin,
  registrarOrigemRecuperacaoAdmin,
} from "@/lib/admin-pedidos.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  Search,
  Truck,
  ShoppingCart,
  MessageCircle,
  Mail,
  Mail as MailIcon,
  Trash2,
} from "lucide-react";
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
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pedidos")({ component: AdminPedidos });

// Status atualizado conforme novo fluxo do ciclo de vida da venda
const STATUS_OPTIONS = [
  "pendente",
  "pago",
  "em_separacao",
  "enviado",
  "entregue",
  "cancelado",
] as const;
type StatusKey = (typeof STATUS_OPTIONS)[number];

const STATUS_LABEL: Record<string, string> = {
  pendente: "⏳ Pedido Pendente",
  pago: "💳 Pagamento Aprovado",
  em_separacao: "📦 Em Separação",
  enviado: "🚚 Pedido Enviado",
  entregue: "🏁 Pedido Entregue",
  cancelado: "❌ Compra Cancelada",
  // legados
  aguardando_pagamento: "⏳ Aguardando Pagamento",
};

const STATUS_STYLE: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  pago: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/40",
  em_separacao: "bg-slate-500/15 text-slate-300 ring-slate-500/40",
  enviado: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
  entregue: "bg-green-700/25 text-green-300 ring-green-700/50",
  cancelado: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
  aguardando_pagamento: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
};

type Endereco = {
  cep: string;
  rua: string;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};
type Cliente = { nome_completo: string | null; email: string | null; telefone: string | null };
type Pedido = {
  id: string;
  numero: number;
  total: number;
  subtotal: number;
  frete: number;
  desconto: number;
  status: string;
  criado_em: string;
  nome_contato: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  codigo_rastreio: string | null;
  metodo_pagamento: string | null;
  endereco_id: string | null;
  cliente_id: string | null;
  carrinho_abandonado?: boolean;
  abandoned_email_sent?: boolean;
  recuperacao_origem?: string | null;
  recuperado_em?: string | null;
  clientes?: Cliente | null;
  enderecos?: Endereco | null;
  itens_pedido?: ItemPedido[] | null;
};

type ItemPedido = {
  id: string;
  pedido_id: string;
  produto_id?: string;
  nome_produto: string;
  quantidade: number;
  preco_unit: number;
  comprimento: string | null;
};

function AdminPedidos() {
  const listarPedidos = useServerFn(listarPedidosAdmin);
  const excluirPedido = useServerFn(excluirPedidoAdmin);
  const atualizarStatusPedido = useServerFn(atualizarStatusPedidoAdmin);
  const enviarRecuperacaoEmail = useServerFn(enviarRecuperacaoEmailAdmin);
  const registrarOrigemRecuperacao = useServerFn(registrarOrigemRecuperacaoAdmin);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [itensMap, setItensMap] = useState<Record<string, ItemPedido[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"gerenciar" | "abandonados">("gerenciar");
  const [quickFilter, setQuickFilter] = useState<"todos" | "pendentes" | "enviados" | "cancelados">(
    "todos",
  );
  const [trackingFor, setTrackingFor] = useState<Pedido | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ pedido: Pedido; rastreio: string } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<Pedido | null>(null);

  const handleDelete = async (p: Pedido) => {
    try {
      await excluirPedido({ data: { pedidoId: p.id } });
      setPedidos((prev) => prev.filter((x) => x.id !== p.id));
      toast.success(`Pedido #${String(p.numero).padStart(5, "0")} removido definitivamente.`);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir pedido.");
      setDeleteTarget(null);
    }
  };

  const handleSendRecoveryEmail = async (p: Pedido) => {
    try {
      await enviarRecuperacaoEmail({ data: { pedidoId: p.id } });
      toast.success(`E-mail de recuperação enviado para ${p.nome_contato ?? "cliente"}.`);
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao enviar e-mail de recuperação.",
      );
    }
  };

  const handleRegisterRecoverySource = async (
    p: Pedido,
    origem: "email_manual" | "whatsapp" | "popup",
  ) => {
    try {
      await registrarOrigemRecuperacao({ data: { pedidoId: p.id, origem } });
      if (origem !== "whatsapp") {
        toast.success("Origem de recuperação registrada.");
      }
      await load();
    } catch (error) {
      console.error(error);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const arr = (await listarPedidos()) as any[];
      const mapItens: Record<string, ItemPedido[]> = {};
      arr.forEach((p) => {
        mapItens[p.id] = (p.itens_pedido ?? []) as ItemPedido[];
      });
      setItensMap(mapItens);
      setPedidos(
        arr.map((p) => ({
          ...p,
          total: Number(p.total),
          subtotal: Number(p.subtotal),
          frete: Number(p.frete),
          desconto: Number(p.desconto),
        })),
      );
    } catch (err: any) {
      console.error("[admin/pedidos]", err);
      toast.error(err instanceof Error ? err.message : "Falha ao carregar pedidos.");
      setPedidos([]);
      setItensMap({});
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-pedidos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "itens_pedido" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const ativos = useMemo(() => pedidos.filter((p) => !p.carrinho_abandonado), [pedidos]);
  const abandonados = useMemo(() => pedidos.filter((p) => p.carrinho_abandonado), [pedidos]);

  const quickFilterOptions = [
    { key: "todos" as const, label: "Todos" },
    { key: "pendentes" as const, label: "⏳ Pendentes" },
    { key: "enviados" as const, label: "🚚 Enviados" },
    { key: "cancelados" as const, label: "❌ Cancelados" },
  ];

  const filteredAtivos = useMemo(() => {
    switch (quickFilter) {
      case "pendentes":
        return ativos.filter((p) => p.status === "pendente");
      case "enviados":
        return ativos.filter((p) => p.status === "enviado");
      case "cancelados":
        return ativos.filter((p) => p.status === "cancelado");
      default:
        return ativos;
    }
  }, [ativos, quickFilter]);

  const filterList = (list: Pedido[]) => {
    const q = search.toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        String(p.numero).includes(q) ||
        (p.nome_contato ?? "").toLowerCase().includes(q) ||
        (p.email_contato ?? "").toLowerCase().includes(q),
    );
  };

  // ===== Atualização de status =====
  const updateStatus = async (
    pedido: Pedido,
    novoStatus: StatusKey,
    rastreio?: string,
  ): Promise<void> => {
    if (novoStatus === "enviado" && !rastreio?.trim()) {
      setTrackingFor(pedido);
      return;
    }

    let atualizado: Pedido;
    try {
      const result = await atualizarStatusPedido({
        data: { pedidoId: pedido.id, status: novoStatus, rastreio: rastreio?.trim() || null },
      });
      atualizado = result.pedido as Pedido;
      setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? atualizado : p)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar status.");
      return;
    }

    if (novoStatus === "enviado") {
      setEmailPreview({ pedido: atualizado, rastreio: rastreio!.trim() });
      toast.success("Status atualizado e aviso registrado para envio ao cliente.");
    } else {
      toast.success(`Status atualizado para "${STATUS_LABEL[novoStatus]}" e aviso registrado.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Gestão de Vendas</h1>
          <p className="text-sm text-slate-400">
            Ciclo completo de pedidos e recuperação de carrinhos.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Buscar por nº, nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-slate-800 bg-slate-900 pl-10 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger
            value="gerenciar"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <Truck className="mr-2 size-4" /> Gerenciar Pedidos
            <span className="ml-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
              {ativos.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="abandonados"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <ShoppingCart className="mr-2 size-4" /> Carrinhos Abandonados
            <span className="ml-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
              {abandonados.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerenciar" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickFilterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setQuickFilter(opt.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  quickFilter === opt.key
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Card className="overflow-hidden border-slate-800 bg-slate-900">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="size-6 animate-spin text-indigo-400" />
              </div>
            ) : (
              <PedidosTable
                pedidos={filterList(filteredAtivos)}
                itensMap={itensMap}
                onChangeStatus={updateStatus}
                onDelete={(p) => setDeleteTarget(p)}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="abandonados" className="mt-4">
          <Card className="overflow-hidden border-slate-800 bg-slate-900">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="size-6 animate-spin text-indigo-400" />
              </div>
            ) : (
              <AbandonadosTable
                pedidos={filterList(abandonados)}
                onSendEmail={handleSendRecoveryEmail}
                onRegisterSource={handleRegisterRecoverySource}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de coleta do código de rastreio */}
      <TrackingDialog
        pedido={trackingFor}
        onClose={() => setTrackingFor(null)}
        onConfirm={async (rastreio) => {
          const p = trackingFor!;
          setTrackingFor(null);
          await updateStatus(p, "enviado", rastreio);
        }}
      />

      {/* Preview do e-mail HTML simulado */}
      <EmailPreviewDialog data={emailPreview} onClose={() => setEmailPreview(null)} />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir pedido</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja apagar este pedido de teste?
              {deleteTarget && (
                <span className="mt-2 block font-mono text-indigo-300">
                  #{String(deleteTarget.numero).padStart(5, "0")} ·{" "}
                  {deleteTarget.nome_contato ?? "—"}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ TABELA DE PEDIDOS ============
function PedidosTable({
  pedidos,
  itensMap,
  onChangeStatus,
  onDelete,
}: {
  pedidos: Pedido[];
  itensMap: Record<string, ItemPedido[]>;
  onChangeStatus: (p: Pedido, s: StatusKey) => void | Promise<void>;
  onDelete: (p: Pedido) => void;
}) {
  if (pedidos.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-slate-400">Nenhum pedido nesta visualização.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Pedido</th>
            <th className="px-4 py-3 text-left">Cliente</th>
            <th className="px-4 py-3 text-left">Produto</th>
            <th className="px-4 py-3 text-left">Valor</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Rastreio</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {pedidos.map((p) => {
            const itens = itensMap[p.id] ?? p.itens_pedido ?? [];
            const nome = p.clientes?.nome_completo || p.nome_contato || "—";
            const email = p.clientes?.email || p.email_contato || "—";
            const tel = p.clientes?.telefone || p.telefone_contato;
            return (
              <tr key={p.id} className="transition hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="font-mono text-indigo-300">
                    #{String(p.numero).padStart(5, "0")}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{nome}</div>
                  <div className="text-xs text-slate-500">{email}</div>
                  {tel && <div className="text-[11px] text-slate-500">{tel}</div>}
                </td>
                <td className="px-4 py-3">
                  {itens.length === 0 ? (
                    <span className="text-xs text-slate-500">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {itens.slice(0, 2).map((it) => (
                        <div key={it.id} className="text-xs text-slate-200">
                          {it.quantidade}× <span className="text-white">{it.nome_produto}</span>
                          {it.comprimento && (
                            <span className="text-slate-400"> · {it.comprimento}</span>
                          )}
                        </div>
                      ))}
                      {itens.length > 2 && (
                        <div className="text-[11px] text-slate-500">
                          +{itens.length - 2} item(ns)
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-white">{brl(p.total)}</td>
                <td className="px-4 py-3">
                  <Select
                    value={STATUS_OPTIONS.includes(p.status as StatusKey) ? p.status : "pendente"}
                    onValueChange={(v) => onChangeStatus(p, v as StatusKey)}
                  >
                    <SelectTrigger
                      className={`h-8 w-[210px] rounded-full border-0 px-3 text-xs font-medium ring-1 ${STATUS_STYLE[p.status] ?? STATUS_STYLE.pendente}`}
                    >
                      <SelectValue>{STATUS_LABEL[p.status] ?? p.status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  {p.codigo_rastreio ? (
                    <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-xs text-sky-300">
                      {p.codigo_rastreio}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(p)}
                    aria-label="Excluir pedido"
                    title="Excluir pedido"
                    className="inline-flex size-8 items-center justify-center rounded-md text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============ CARRINHOS ABANDONADOS ============
function AbandonadosTable({
  pedidos,
  onSendEmail,
  onRegisterSource,
}: {
  pedidos: Pedido[];
  onSendEmail: (p: Pedido) => Promise<void>;
  onRegisterSource: (p: Pedido, origem: "email_manual" | "whatsapp" | "popup") => Promise<void>;
}) {
  if (pedidos.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-slate-400">
        Nenhum carrinho abandonado no momento.
      </p>
    );
  }
  const whatsappLink = (p: Pedido) => {
    const phone = (p.telefone_contato ?? "").replace(/\D/g, "");
    const nome = p.nome_contato ?? "cliente";
    const msg = `Olá ${nome}! Notamos que você deixou um pedido (#${String(p.numero).padStart(5, "0")}) no valor de ${brl(p.total)} pendente em nosso carrinho. Que tal finalizar agora com 5% OFF? Use o cupom VOLTA5. ✨`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };
  const mailtoLink = (p: Pedido) => {
    const subject = `Seu carrinho está te esperando — Pedido #${String(p.numero).padStart(5, "0")}`;
    const body = `Olá ${p.nome_contato ?? ""},\n\nVocê deixou itens no carrinho totalizando ${brl(p.total)}. Finalize agora com 5% OFF usando o cupom VOLTA5.\n\nAté já!\nEquipe ELITE316`;
    return `mailto:${p.email_contato ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Carrinho</th>
            <th className="px-4 py-3 text-left">Cliente</th>
            <th className="px-4 py-3 text-left">Abandonado em</th>
            <th className="px-4 py-3 text-left">Valor</th>
            <th className="px-4 py-3 text-right">Recuperação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {pedidos.map((p) => (
            <tr key={p.id} className="transition hover:bg-slate-800/40">
              <td className="px-4 py-3 font-mono text-indigo-300">
                #{String(p.numero).padStart(5, "0")}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-white">{p.nome_contato ?? "—"}</div>
                <div className="text-xs text-slate-500">{p.email_contato}</div>
                <div className="text-xs text-slate-500">{p.telefone_contato}</div>
              </td>
              <td className="px-4 py-3 text-slate-300">
                {new Date(p.criado_em).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </td>
              <td className="px-4 py-3 font-semibold text-white">{brl(p.total)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-500 text-white hover:bg-emerald-400"
                      onClick={async () => {
                        await onRegisterSource(p, "whatsapp");
                        window.open(whatsappLink(p), "_blank", "noopener,noreferrer");
                      }}
                    >
                      <MessageCircle className="mr-1 size-4" /> WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                      onClick={async () => {
                        await onRegisterSource(p, "email_manual");
                        window.location.href = mailtoLink(p);
                      }}
                    >
                      <Mail className="mr-1 size-4" /> E-mail
                    </Button>
                  </div>
                  {p.abandoned_email_sent && (
                    <div className="text-right text-[11px] text-emerald-300">
                      E-mail automático já disparado
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ MODAL DE RASTREIO ============
function TrackingDialog({
  pedido,
  onClose,
  onConfirm,
}: {
  pedido: Pedido | null;
  onClose: () => void;
  onConfirm: (rastreio: string) => void;
}) {
  const [valor, setValor] = useState("");
  useEffect(() => {
    setValor(pedido?.codigo_rastreio ?? "");
  }, [pedido]);
  return (
    <Dialog open={!!pedido} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">🚚 Marcar pedido como Enviado</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Informe o código de rastreio do pedido{" "}
            <span className="font-mono text-indigo-300">
              #{String(pedido?.numero ?? 0).padStart(5, "0")}
            </span>
            . O cliente receberá um e-mail HTML com o link de acompanhamento.
          </p>
          <div>
            <Label className="text-slate-300">Código de Rastreio *</Label>
            <Input
              autoFocus
              value={valor}
              onChange={(e) => setValor(e.target.value.toUpperCase())}
              placeholder="BR123456789XX"
              className="border-slate-700 bg-slate-950 font-mono text-slate-100"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            disabled={!valor.trim()}
            onClick={() => onConfirm(valor.trim())}
            className="bg-sky-500 text-white hover:bg-sky-400"
          >
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ AUTOMAÇÃO: SIMULAÇÃO DE E-MAIL DE RASTREIO ============
function emailRastreioHTML(p: Pedido, rastreio: string) {
  const numero = String(p.numero).padStart(5, "0");
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;color:#fff">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.85">ELITE316</div>
          <div style="font-size:22px;font-weight:700;margin-top:6px">🚚 Seu pedido foi enviado!</div>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 14px;font-size:15px">Olá <strong>${p.nome_contato ?? "cliente"}</strong>,</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#444">
            Boas notícias: o pedido <strong>#${numero}</strong> acaba de sair para entrega.
            Acompanhe o trajeto pelo código abaixo:
          </p>
          <div style="background:#0f172a;color:#e0f2fe;padding:18px;border-radius:10px;text-align:center;font-family:Menlo,monospace;font-size:18px;letter-spacing:2px">
            ${rastreio}
          </div>
          <div style="text-align:center;margin:24px 0 8px">
            <a href="https://rastreamento.correios.com.br/app/index.php" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">
              Rastrear pacote
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:#888;text-align:center">
            Total: <strong>${brl(p.total)}</strong> · Forma de pagamento: ${p.metodo_pagamento ?? "—"}
          </p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:18px 32px;text-align:center;font-size:11px;color:#999">
          © ELITE316 — Correntes em aço 316L
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function simularEnvioEmailRastreio(p: Pedido, rastreio: string) {
  // Simulação: registra no console e dispara um toast informando o disparo.
  // A pré-visualização HTML real é aberta em um modal logo após.
  console.info("[AUTOMAÇÃO] E-mail de rastreio simulado", {
    to: p.email_contato,
    subject: `Seu pedido #${String(p.numero).padStart(5, "0")} foi enviado 🚚`,
    rastreio,
    html: emailRastreioHTML(p, rastreio),
  });
  toast.success("E-mail de rastreio disparado para o cliente (simulação).");
}

function EmailPreviewDialog({
  data,
  onClose,
}: {
  data: { pedido: Pedido; rastreio: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-900 text-slate-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <MailIcon className="size-4 text-sky-400" /> Pré-visualização do e-mail enviado
          </DialogTitle>
        </DialogHeader>
        {data && (
          <>
            <div className="mb-2 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
              <div>
                <span className="text-slate-500">Para:</span>{" "}
                <span className="text-slate-200">{data.pedido.email_contato ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-500">Assunto:</span>{" "}
                <span className="text-slate-200">
                  Seu pedido #{String(data.pedido.numero).padStart(5, "0")} foi enviado 🚚
                </span>
              </div>
            </div>
            <iframe
              title="Preview e-mail"
              className="h-[520px] w-full rounded-lg border border-slate-800 bg-white"
              srcDoc={emailRastreioHTML(data.pedido, data.rastreio)}
            />
          </>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="bg-indigo-500 text-white hover:bg-indigo-400">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
