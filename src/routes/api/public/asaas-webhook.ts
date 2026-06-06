import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enviarEmailServer } from "@/lib/emails.server";
import { htmlPagamentoConfirmado } from "@/lib/emails";
import { applyReferralReward } from "@/lib/referral.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, asaas-access-token",
};

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const event: string = body?.event ?? "";
          const payment = body?.payment;
          const paymentId: string | undefined = payment?.id;

          console.log("[Asaas webhook]", event, paymentId);

          const aprovado = [
            "PAYMENT_CONFIRMED",
            "PAYMENT_RECEIVED",
            "PAYMENT_RECEIVED_IN_CASH",
          ].includes(event);

          if (aprovado && paymentId) {
            // Localiza o pedido pelo paymentId armazenado em codigo_rastreio
            const { data: pedido } = await supabaseAdmin
              .from("pedidos")
              .select("id, cliente_id, email_contato, nome_contato, numero, total, status, carrinho_abandonado, referido_por, referral_credit_applied")
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

              if (pedido.cliente_id) {
                await (supabaseAdmin.from("clientes") as any)
                  .update({ carrinho_abandonado: false })
                  .eq("id", pedido.cliente_id);
              } else if (pedido.email_contato) {
                await (supabaseAdmin.from("clientes") as any)
                  .update({ carrinho_abandonado: false })
                  .eq("email", pedido.email_contato);
              }

              if (pedido.referido_por && !pedido.referral_credit_applied) {
                await applyReferralReward(supabaseAdmin, pedido.referido_por, pedido.id, pedido.numero);
              }

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
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (err) {
          console.error("[Asaas webhook] erro", err);
          return new Response(JSON.stringify({ ok: false }), {
            status: 200, // sempre 200 p/ Asaas não reenviar infinito enquanto debugamos
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
