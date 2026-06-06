import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enviarEmailServer } from "@/lib/emails.server";
import { htmlPagamentoConfirmado } from "@/lib/emails";
import { getAsaasBase, getAsaasApiKey } from "@/lib/asaas.config";

const ASAAS_BASE = getAsaasBase();

const STATUS_APROVADOS = new Set([
  "RECEIVED",
  "CONFIRMED",
  "RECEIVED_IN_CASH",
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
]);

export async function verificarPagamentoAsaasServer(paymentId: string) {
  const key = getAsaasApiKey();
  if (!key) throw new Error("Pagamento indisponível: ASAAS_API_KEY não configurada.");

  const res = await fetch(`${ASAAS_BASE}/payments/${paymentId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", access_token: key },
  });
  const text = await res.text();
  let json: { status?: string; message?: string } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  if (!res.ok) {
    console.error("[verificarPagamento] Asaas", res.status, json);
    throw new Error(json.message || `Falha ao consultar Asaas (HTTP ${res.status}).`);
  }

  const status = (json.status || "").toUpperCase();
  const aprovado = STATUS_APROVADOS.has(status);

  if (!aprovado) {
    return { aprovado: false as const, status };
  }

  // Atualiza o pedido vinculado pelo paymentId em codigo_rastreio
  const { data: pedido } = await supabaseAdmin
    .from("pedidos")
    .select("id, cliente_id, email_contato, nome_contato, numero, total, status, carrinho_abandonado")
    .eq("codigo_rastreio", paymentId)
    .maybeSingle();

  if (pedido && pedido.status !== "pago") {
    await supabaseAdmin
      .from("pedidos")
      .update({
        status: "pago",
        carrinho_abandonado: false,
        atualizado_em: new Date().toISOString(),
        ...(pedido.carrinho_abandonado ? { recuperado_em: new Date().toISOString() } : {}),
      })
      .eq("id", pedido.id);

    if (pedido.email_contato) {
      void enviarEmailServer(
        pedido.email_contato,
        `✅ Pagamento confirmado — Pedido #${pedido.numero} ELITE316`,
        htmlPagamentoConfirmado({
          nome: pedido.nome_contato ?? "",
          numero: pedido.numero,
          total: Number(pedido.total ?? 0),
        }),
      );
    }
  }

  return { aprovado: true as const, status, pedidoId: pedido?.id ?? null };
}
