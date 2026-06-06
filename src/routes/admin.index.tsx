import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { DollarSign, Truck, Clock, AlertTriangle, ArrowUpRight, Package, Users, ShoppingBag, MessageCircle } from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Stats = {
  faturamentoMensal: number;
  faturamentoRecuperado: number;
  pedidosEnviados: number;
  aguardandoPagamento: number;
  alertasEstoque: number;
  produtos: number;
  clientes: number;
  totalPedidos: number;
};

function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    faturamentoMensal: 0,
    faturamentoRecuperado: 0,
    pedidosEnviados: 0,
    aguardandoPagamento: 0,
    alertasEstoque: 0,
    produtos: 0,
    clientes: 0,
    totalPedidos: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const STATUS_FATURADOS = ["pago", "em_separacao", "enviado", "entregue"];

        const [recv, env, pend, estoque, prod, cli, tot, rec, aband] = await Promise.all([
          // Faturamento real: soma de todos os pedidos confirmados (não cancelados / não abandonados) no mês
          supabase
            .from("pedidos")
            .select("total, status, criado_em")
            .in("status", STATUS_FATURADOS)
            .eq("carrinho_abandonado", false)
            .gte("criado_em", inicioMes.toISOString()),
          supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "enviado"),
          supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "pendente"),
          supabase.from("variantes_produto").select("estoque").lt("estoque", 5),
          supabase.from("produtos").select("id", { count: "exact", head: true }),
          supabase.from("clientes").select("id", { count: "exact", head: true }),
          supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("carrinho_abandonado", false),
          supabase
            .from("pedidos")
            .select("total, recuperacao_origem, recuperado_em")
            .not("recuperacao_origem", "is", null)
            .gte("recuperado_em", inicioMes.toISOString()),
          supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("carrinho_abandonado", true),
        ]);

        if (recv.error) console.error("[admin/dashboard] faturamento error", recv.error);

        const faturamentoMensal = (recv.data ?? []).reduce(
          (s, r: any) => s + Number(r.total ?? 0),
          0,
        );
        const faturamentoRecuperado = (rec.data ?? []).reduce(
          (s, r: any) => s + Number(r.total ?? 0),
          0,
        );
        setStats({
          faturamentoMensal,
          faturamentoRecuperado,
          pedidosEnviados: env.count ?? 0,
          aguardandoPagamento: pend.count ?? 0,
          alertasEstoque: estoque.data?.length ?? 0,
          produtos: prod.count ?? 0,
          clientes: cli.count ?? 0,
          totalPedidos: tot.count ?? 0,
        });
      } catch (err) {
        console.error("[admin/dashboard] erro ao carregar estatísticas", err);
      }
    })();
  }, []);

  const metrics = [
    {
      label: "Faturamento Mensal",
      value: brl(stats.faturamentoMensal),
      icon: DollarSign,
      accent: "from-indigo-500/20 to-indigo-500/0",
      iconBg: "bg-indigo-500/10 text-indigo-300",
      hint: "Pedidos confirmados no mês",
    },
    {
      label: "Pedidos Enviados",
      value: stats.pedidosEnviados.toLocaleString("pt-BR"),
      icon: Truck,
      accent: "from-emerald-500/20 to-emerald-500/0",
      iconBg: "bg-emerald-500/10 text-emerald-300",
      hint: "Total despachado",
    },
    {
      label: "Faturamento Recuperado",
      value: brl(stats.faturamentoRecuperado),
      icon: MessageCircle,
      accent: "from-sky-500/20 to-sky-500/0",
      iconBg: "bg-sky-500/10 text-sky-300",
      hint: "Receita de pedidos recuperados",
    },
    {
      label: "Aguardando Pagamento",
      value: stats.aguardandoPagamento.toLocaleString("pt-BR"),
      icon: Clock,
      accent: "from-amber-500/20 to-amber-500/0",
      iconBg: "bg-amber-500/10 text-amber-300",
      hint: "Pedidos pendentes",
    },
    {
      label: "Alertas de Estoque Baixo",
      value: stats.alertasEstoque.toLocaleString("pt-BR"),
      icon: AlertTriangle,
      accent: "from-rose-500/20 to-rose-500/0",
      iconBg: "bg-rose-500/10 text-rose-300",
      hint: "Variantes com menos de 5 unidades",
    },
  ] as const;

  const quick = [
    { to: "/admin/produtos", label: "Produtos", value: stats.produtos, icon: Package },
    { to: "/admin/clientes", label: "Clientes", value: stats.clientes, icon: Users },
    { to: "/admin/pedidos", label: "Pedidos", value: stats.totalPedidos, icon: ShoppingBag },
    { to: "/admin/recuperacao", label: "Recuperação", value: brl(stats.faturamentoRecuperado), icon: MessageCircle },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Visão Geral</h1>
          <p className="mt-1 text-sm text-slate-400">Acompanhe os principais indicadores da sua loja em tempo real.</p>
        </div>
        <span className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
          {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* 4 metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className={`relative overflow-hidden border-slate-800 bg-slate-900 p-5 transition hover:border-indigo-500/30`}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${m.accent}`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{m.label}</p>
                <div className={`flex size-9 items-center justify-center rounded-lg ${m.iconBg}`}>
                  <m.icon className="size-4" />
                </div>
              </div>
              <p className="mt-4 font-display text-3xl text-white">{m.value}</p>
              <p className="mt-1 text-xs text-slate-500">{m.hint}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {quick.map((q) => (
          <Link key={q.label} to={q.to}>
            <Card className="group flex items-center justify-between border-slate-800 bg-slate-900 p-5 transition hover:border-indigo-500/40">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 group-hover:bg-indigo-500/10 group-hover:text-indigo-300">
                  <q.icon className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">{q.label}</p>
                  <p className="font-display text-xl text-white">{q.value}</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-slate-600 group-hover:text-indigo-300" />
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-indigo-300">Atalhos</p>
            <h2 className="mt-1 font-display text-xl text-white">Gerencie sua operação</h2>
            <p className="mt-1 text-sm text-slate-400">Acesse rapidamente as áreas mais usadas do painel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/pedidos" className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-indigo-400">Ver Pedidos</Link>
            <Link to="/admin/produtos" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 hover:border-indigo-500/50 hover:text-white">Cadastrar Produto</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
