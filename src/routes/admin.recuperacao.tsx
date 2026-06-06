import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, MessageCircle } from "lucide-react";
import { brl } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/recuperacao")({
  component: AdminRecuperacao,
});

type RecoverySource = "email_automatico" | "email_manual" | "whatsapp" | "popup" | "outros";

type RecoveryRow = {
  name: string;
  value: number;
  label: string;
  color: string;
};

type SourceData = {
  recuperacao_origem: string | null;
  total: number;
};

const SOURCE_LABELS: Record<RecoverySource, string> = {
  email_automatico: "E-mail Automático",
  email_manual: "E-mail Manual",
  whatsapp: "WhatsApp",
  popup: "Pop-up",
  outros: "Outros",
};

const SOURCE_COLORS: Record<RecoverySource, string> = {
  email_automatico: "#38bdf8",
  email_manual: "#818cf8",
  whatsapp: "#22c55e",
  popup: "#f59e0b",
  outros: "#64748b",
};

function AdminRecuperacao() {
  const [loading, setLoading] = useState(true);
  const [sourceData, setSourceData] = useState<RecoveryRow[]>([]);
  const [faturamentoRecuperado, setFaturamentoRecuperado] = useState(0);
  const [carrinhosPendentes, setCarrinhosPendentes] = useState(0);
  const [emailsAutomáticos, setEmailsAutomáticos] = useState(0);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      try {
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const [recoveredRes, pendingRes, autoRes] = await Promise.all([
          supabase
            .from("pedidos")
            .select("recuperacao_origem, total")
            .not("recuperacao_origem", "is", null)
            .gte("recuperado_em", inicioMes.toISOString()),
          supabase
            .from("pedidos")
            .select("id", { count: "exact", head: true })
            .eq("carrinho_abandonado", true)
            .eq("status", "pendente"),
          supabase
            .from("pedidos")
            .select("id", { count: "exact", head: true })
            .eq("abandoned_email_sent", true),
        ]);

        if (!canceled) {
          const recoveredRows = recoveredRes.data ?? [];
          const totalsBySource = recoveredRows.reduce<Record<RecoverySource, number>>((acc, row) => {
            const key = (row.recuperacao_origem as RecoverySource) || "outros";
            acc[key] = (acc[key] ?? 0) + Number(row.total ?? 0);
            return acc;
          }, {
            email_automatico: 0,
            email_manual: 0,
            whatsapp: 0,
            popup: 0,
            outros: 0,
          });

          const rows: RecoveryRow[] = (Object.keys(totalsBySource) as RecoverySource[])
            .map((key) => ({
              name: key,
              value: totalsBySource[key] ?? 0,
              label: SOURCE_LABELS[key],
              color: SOURCE_COLORS[key],
            }))
            .filter((item) => item.value > 0);

          setSourceData(rows.length ? rows : [{ name: "outros", label: SOURCE_LABELS.outros, value: 0, color: SOURCE_COLORS.outros }]);
          setFaturamentoRecuperado(
            recoveredRows.reduce((sum, row) => sum + Number(row.total ?? 0), 0),
          );
          setCarrinhosPendentes(pendingRes.count ?? 0);
          setEmailsAutomáticos(autoRes.count ?? 0);
        }
      } catch (err) {
        console.error("[admin/recuperacao] erro ao carregar métricas", err);
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    void load();
    return () => {
      canceled = true;
    };
  }, []);

  const chartData = useMemo(() => sourceData.map((item) => ({ ...item })), [sourceData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white">Recuperação de Vendas</h1>
          <p className="text-sm text-slate-400">
            Analise as receitas recuperadas e as ações que estão impulsionando a volta dos
            carrinhos.
          </p>
        </div>
        <Link to="/admin">
          <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800">
            <ArrowLeft className="mr-2 size-4" /> Voltar para o painel
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center p-12 border-slate-800 bg-slate-900">
          <Loader2 className="size-6 animate-spin text-indigo-400" />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Faturamento recuperado</p>
                <p className="mt-4 text-3xl font-display text-white">{brl(faturamentoRecuperado)}</p>
                <p className="mt-2 text-sm text-slate-400">Receita de carrinhos abandonados recuperados neste mês.</p>
              </Card>
              <Card className="border-slate-800 bg-slate-900 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Carrinhos pendentes</p>
                <p className="mt-4 text-3xl font-display text-white">{carrinhosPendentes.toLocaleString("pt-BR")}</p>
                <p className="mt-2 text-sm text-slate-400">Quantidade de carrinhos abandonados ainda aguardando ação.</p>
              </Card>
            </div>

            <Card className="border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Canal de recuperação</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Receita por origem</h2>
                </div>
                <div className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  {sourceData.reduce((sum, item) => sum + item.value, 0) > 0
                    ? sourceData.length
                    : 0}{" "}
                  canais ativos
                </div>
              </div>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 16, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => brl(value)} />
                    <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                    <Bar dataKey="value" name="Receita" fill="#6366f1" radius={[10, 10, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sky-300">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">E-mails automáticos</p>
                  <p className="mt-2 text-3xl font-display text-white">{emailsAutomáticos.toLocaleString("pt-BR")}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-400">Total de recuperações com e-mail automático pesquisadas na base.</p>
            </Card>

            <Card className="border-slate-800 bg-slate-900 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Distribuição</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Origem das oportunidades</h2>
              <div className="mt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={52}
                      paddingAngle={3}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => brl(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
