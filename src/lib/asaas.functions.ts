import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enviarEmailServer } from "@/lib/emails.server";
import { htmlPedidoConfirmado } from "@/lib/emails";

const ASAAS_BASE = "https://api.asaas.com/v3";

type AsaasErrorResponse = {
  errors?: Array<{ description?: string }>;
  message?: string;
  raw?: string;
};

function getApiKey() {
  return process.env.ASAAS_API_KEY || null;
}

async function asaas<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getApiKey();
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: AsaasErrorResponse;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    console.error("[Asaas] error", res.status, json);
    const msg = json.errors?.[0]?.description || json.message || `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}




const itemSchema = z.object({
  produto_id: z.string().optional().nullable(),
  variante_id: z.string().optional().nullable(),
  nome: z.string().min(1).max(255),
  comprimento: z.string().max(50).optional().nullable(),
  preco_unit: z.number().nonnegative(),
  quantidade: z.number().int().positive(),
});

export const criarCobrancaPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nome: z.string().min(2).max(120),
        email: z.string().email(),
        cpfCnpj: z.string().min(11).max(20),
        telefone: z.string().min(8).max(25),
        valor: z.number().positive().max(1_000_000),
        descricao: z.string().max(500).optional(),
        endereco: z.object({
          cep: z.string().min(8).max(10),
          rua: z.string().min(1).max(200),
          numero: z.string().min(1).max(20),
          complemento: z.string().max(120).optional().nullable(),
          bairro: z.string().min(1).max(120),
          cidade: z.string().min(1).max(120),
          estado: z.string().min(2).max(2),
        }),
        itens: z.array(itemSchema).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const clienteId = context.userId;
    const cpfDigits = data.cpfCnpj.replace(/\D/g, "");
    const telDigits = data.telefone.replace(/\D/g, "");
    const cepDigits = data.endereco.cep.replace(/\D/g, "");

    if (!getApiKey()) {
      throw new Error("Pagamento indisponível: ASAAS_API_KEY não configurada.");
    }

    let paymentId: string;
    let paymentStatus: string;
    let paymentValue: number;
    let qrImageSrc: string;
    let pixPayload: string;
    let expirationDate: string;
    let invoiceUrl: string | undefined;

    // 1) Cliente Asaas
    const customer = await asaas<{ id: string }>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: data.nome,
        email: data.email,
        cpfCnpj: cpfDigits,
        mobilePhone: telDigits,
        postalCode: cepDigits,
        address: data.endereco.rua,
        addressNumber: data.endereco.numero,
        complement: data.endereco.complemento || undefined,
        province: data.endereco.bairro,
      }),
    });

    // 2) Cobrança PIX
    const vencimento = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    const payment = await asaas<{
      id: string;
      status: string;
      value: number;
      invoiceUrl?: string;
    }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customer.id,
        billingType: "PIX",
        value: Number(data.valor.toFixed(2)),
        dueDate: vencimento,
        description: data.descricao || "Pedido ELITE316",
      }),
    });

    // 3) QR Code
    const qr = await asaas<{
      encodedImage: string;
      payload: string;
      expirationDate: string;
    }>(`/payments/${payment.id}/pixQrCode`, { method: "GET" });

    paymentId = payment.id;
    paymentStatus = payment.status;
    paymentValue = payment.value;
    qrImageSrc = `data:image/png;base64,${qr.encodedImage}`;
    pixPayload = qr.payload;
    expirationDate = qr.expirationDate;
    invoiceUrl = payment.invoiceUrl;

    // Persistência Supabase
    let enderecoId: string | null = null;
    let pedidoId: string | null = null;

    try {
      const supabase = context.supabase;

      await supabase.from("clientes").upsert({
        id: clienteId,
        email: data.email,
        telefone: telDigits,
        nome_completo: data.nome,
        cpf: cpfDigits,
      });

      const enderecoPayload = {
        cliente_id: clienteId,
        cep: cepDigits,
        rua: data.endereco.rua,
        numero: data.endereco.numero,
        complemento: data.endereco.complemento || null,
        bairro: data.endereco.bairro,
        cidade: data.endereco.cidade,
        estado: data.endereco.estado,
      };

      const { data: enderecoAtual } = await supabase
        .from("enderecos")
        .select("id")
        .eq("cliente_id", clienteId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enderecoAtual?.id) {
        const { data: end, error: enderecoError } = await supabase
          .from("enderecos")
          .update(enderecoPayload)
          .eq("id", enderecoAtual.id)
          .select("id")
          .single();
        if (enderecoError) throw enderecoError;
        enderecoId = end.id;
      } else {
        const { data: end, error: enderecoError } = await supabase
          .from("enderecos")
          .insert(enderecoPayload)
          .select("id")
          .single();
        if (enderecoError) throw enderecoError;
        enderecoId = end.id;
      }

      const { data: pedido, error: pedidoError } = await supabase
        .from("pedidos")
        .insert({
          status: "pendente",
          metodo_pagamento: "PIX",
          subtotal: data.valor,
          total: data.valor,
          frete: 0,
          desconto: 0,
          carrinho_abandonado: false,
          nome_contato: data.nome,
          email_contato: data.email,
          telefone_contato: telDigits,
          codigo_rastreio: paymentId,
          cliente_id: clienteId,
          endereco_id: enderecoId,
        })
        .select("id, numero")
        .single();
      if (pedidoError) throw pedidoError;
      pedidoId = pedido?.id ?? null;
      if (!pedidoId) throw new Error("Pedido não foi gravado no banco de dados.");
      const numeroPedido = pedido?.numero;

      // Itens
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const asUuid = (v?: string | null) => (v && UUID_RE.test(v) ? v : null);

      if (pedidoId && data.itens.length > 0) {
        const { error: itensError } = await supabase.from("itens_pedido").insert(
          data.itens.map((i) => ({
            pedido_id: pedidoId!,
            produto_id: asUuid(i.produto_id),
            variante_id: asUuid(i.variante_id),
            nome_produto: i.nome,
            comprimento: i.comprimento || null,
            preco_unit: i.preco_unit,
            quantidade: i.quantidade,
          })),
        );
        if (itensError) throw itensError;

        // Reduz estoque das variantes (apenas com UUID válido)
        for (const item of data.itens) {
          const vid = asUuid(item.variante_id);
          if (!vid) continue;
          const { data: v } = await supabase
            .from("variantes_produto")
            .select("estoque")
            .eq("id", vid)
            .maybeSingle();
          if (v && typeof v.estoque === "number") {
            const novo = Math.max(0, v.estoque - item.quantidade);
            await supabase
              .from("variantes_produto")
              .update({ estoque: novo })
              .eq("id", vid);
          }
        }
      }

      // E-mail de confirmação do pedido com instruções de PIX
      void enviarEmailServer(
        data.email,
        `Pedido #${numeroPedido} recebido — aguardando pagamento`,
        htmlPedidoConfirmado({
          nome: data.nome,
          numero: numeroPedido ?? "—",
          total: data.valor,
          pixCopiaCola: pixPayload,
          qrCodeImage: qrImageSrc,
          itens: data.itens.map((i) => ({
            nome: i.nome,
            quantidade: i.quantidade,
            preco_unit: i.preco_unit,
            comprimento: i.comprimento,
          })),
        }),
      );
    } catch (e) {
      console.error("[Asaas] falha ao gravar pedido", e);
      throw new Error("PIX gerado, mas não foi possível salvar o pedido. Contate o suporte.");
    }

    return {
      paymentId,
      status: paymentStatus,
      valor: paymentValue,
      qrCodeImage: qrImageSrc,
      pixCopiaCola: pixPayload,
      expiraEm: expirationDate,
      invoiceUrl,
      pedidoId,
    };
  });
