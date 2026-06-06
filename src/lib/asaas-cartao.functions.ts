import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enviarEmailServer } from "@/lib/emails.server";
import { htmlPagamentoConfirmado } from "@/lib/emails";
import { applyReferralReward } from "@/lib/referral.server";
import { getAsaasBase, getAsaasApiKey } from "@/lib/asaas.config";

const ASAAS_BASE = getAsaasBase();

type AsaasErrorResponse = {
  errors?: Array<{ description?: string }>;
  message?: string;
};

const itemSchema = z.object({
  produto_id: z.string().optional().nullable(),
  variante_id: z.string().optional().nullable(),
  nome: z.string().min(1).max(255),
  comprimento: z.string().max(50).optional().nullable(),
  preco_unit: z.number().nonnegative(),
  quantidade: z.number().int().positive(),
});

export const criarCobrancaCartao = createServerFn({ method: "POST" })
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
        subtotal: z.number().positive(),
        desconto: z.number().nonnegative().default(0),
        cupomCodigo: z.string().max(100).optional().nullable(),
        referidoPor: z.string().uuid().optional().nullable(),
        referralAmountUsed: z.number().nonnegative().default(0),
        frete: z.number().nonnegative().default(0),
        freteTipo: z.string().max(50).optional().nullable(),
        cartao: z.object({
          holderName: z.string().min(2).max(120),
          number: z.string().min(13).max(25),
          expiryMonth: z.string().min(1).max(2),
          expiryYear: z.string().min(2).max(4),
          ccv: z.string().min(3).max(4),
        }),
        itens: z.array(itemSchema).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const key = getAsaasApiKey();
    if (!key) throw new Error("Pagamento indisponível: ASAAS_API_KEY não configurada.");

    const clienteId = context.userId;
    const cpfDigits = data.cpfCnpj.replace(/\D/g, "");
    const telDigits = data.telefone.replace(/\D/g, "");
    const cepDigits = data.endereco.cep.replace(/\D/g, "");
    const numDigits = data.cartao.number.replace(/\D/g, "");
    const expYear = data.cartao.expiryYear.length === 2
      ? `20${data.cartao.expiryYear}`
      : data.cartao.expiryYear;

    const asaas = async <T>(path: string, init: RequestInit): Promise<T> => {
      const res = await fetch(`${ASAAS_BASE}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          access_token: key,
          ...(init.headers || {}),
        },
      });
      const text = await res.text();
      let json: AsaasErrorResponse = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        // ignore
      }
      if (!res.ok) {
        const msg = json.errors?.[0]?.description || json.message || `Asaas HTTP ${res.status}`;
        throw new Error(msg);
      }
      return json as T;
    };

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

    // 2) Cobrança CARTÃO (síncrono — Asaas devolve o status na hora)
    const vencimento = new Date().toISOString().slice(0, 10);
    const payment = await asaas<{ id: string; status: string; value: number }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customer.id,
        billingType: "CREDIT_CARD",
        value: Number(data.valor.toFixed(2)),
        dueDate: vencimento,
        description: data.descricao || "Pedido ELITE316",
        creditCard: {
          holderName: data.cartao.holderName,
          number: numDigits,
          expiryMonth: data.cartao.expiryMonth.padStart(2, "0"),
          expiryYear: expYear,
          ccv: data.cartao.ccv,
        },
        creditCardHolderInfo: {
          name: data.nome,
          email: data.email,
          cpfCnpj: cpfDigits,
          postalCode: cepDigits,
          addressNumber: data.endereco.numero,
          addressComplement: data.endereco.complemento || undefined,
          phone: telDigits,
          mobilePhone: telDigits,
        },
      }),
    });

    const aprovado = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(
      (payment.status || "").toUpperCase(),
    );
    if (!aprovado) {
      throw new Error("Transação recusada pela operadora. Verifique os dados e tente novamente.");
    }

    // 3) Persiste cliente, endereço, pedido e itens
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

    let enderecoId: string;
    if (enderecoAtual?.id) {
      const { data: end, error } = await supabase
        .from("enderecos")
        .update(enderecoPayload)
        .eq("id", enderecoAtual.id)
        .select("id")
        .single();
      if (error) throw error;
      enderecoId = end.id;
    } else {
      const { data: end, error } = await supabase
        .from("enderecos")
        .insert(enderecoPayload)
        .select("id")
        .single();
      if (error) throw error;
      enderecoId = end.id;
    }

    const { data: pedido, error: pedErr } = await supabase
      .from("pedidos")
      .insert({
        status: "pago",
        metodo_pagamento: "CARTAO",
        subtotal: data.subtotal,
        total: data.valor,
        frete: data.frete,
        frete_tipo: data.freteTipo,
        desconto: data.desconto,
        carrinho_abandonado: false,
        nome_contato: data.nome,
        email_contato: data.email,
        telefone_contato: telDigits,
        codigo_rastreio: payment.id,
        cliente_id: clienteId,
        endereco_id: enderecoId,
        cupom_codigo: data.cupomCodigo,
        referido_por: data.referidoPor,
        referral_credit_applied: false,
      })
      .select("id, numero")
      .single();
    if (pedErr) throw pedErr;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const asUuid = (v?: string | null) => (v && UUID_RE.test(v) ? v : null);
    if (data.itens.length > 0) {
      await supabase.from("itens_pedido").insert(
        data.itens.map((i) => ({
          pedido_id: pedido.id,
          produto_id: asUuid(i.produto_id),
          variante_id: asUuid(i.variante_id),
          nome_produto: i.nome,
          comprimento: i.comprimento || null,
          preco_unit: i.preco_unit,
          quantidade: i.quantidade,
        })),
      );
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
          await supabase.from("variantes_produto").update({ estoque: novo }).eq("id", vid);
        }
      }
    }

    if (data.referralAmountUsed > 0 && clienteId) {
      const { data: clienteAtual } = await supabase
        .from("clientes")
        .select("referral_balance")
        .eq("id", clienteId)
        .maybeSingle();
      const currentBalance = Number(clienteAtual?.referral_balance ?? 0);
      const newBalance = Math.max(0, currentBalance - data.referralAmountUsed);
      await supabase.from("clientes").update({ referral_balance: newBalance }).eq("id", clienteId);
    }

    if (data.referidoPor) {
      await applyReferralReward(supabase, data.referidoPor, pedido.id, pedido.numero);
    }

    void enviarEmailServer(
      data.email,
      `✅ Pagamento confirmado — Pedido #${pedido.numero} ELITE316`,
      htmlPagamentoConfirmado({
        nome: data.nome,
        numero: pedido.numero,
        total: Number(data.valor),
      }),
    );

    return { paymentId: payment.id, status: payment.status, pedidoId: pedido.id };
  });
