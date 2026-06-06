import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enviarEmailServer } from "@/lib/emails.server";
import { htmlPedidoEnviado, htmlPagamentoConfirmado, htmlRecuperacaoCarrinho } from "@/lib/emails";

const PEDIDO_SELECT =
  "*, clientes:cliente_id(nome_completo,email,telefone), enderecos:endereco_id(cep,rua,numero,complemento,bairro,cidade,estado), itens_pedido(id,pedido_id,produto_id,nome_produto,quantidade,preco_unit,comprimento), abandoned_email_sent, recuperacao_origem, recuperado_em";

type StatusKey = "pendente" | "pago" | "em_separacao" | "enviado" | "entregue" | "cancelado";

function normalizePedido(pedido: any) {
  return {
    ...pedido,
    total: Number(pedido.total ?? 0),
    subtotal: Number(pedido.subtotal ?? 0),
    frete: Number(pedido.frete ?? 0),
    desconto: Number(pedido.desconto ?? 0),
    itens_pedido: (pedido.itens_pedido ?? []).map((item: any) => ({
      ...item,
      preco_unit: Number(item.preco_unit ?? 0),
    })),
  };
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error(`Falha ao validar administrador: ${error.message}`);
  if (!data) throw new Error("Acesso administrativo não autorizado.");
}

export async function listarPedidosAdminServer(userId: string) {
  await assertAdmin(userId);

  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .select(PEDIDO_SELECT)
    .order("criado_em", { ascending: false });

  if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`);
  return (data ?? []).map(normalizePedido);
}

export async function excluirPedidoAdminServer(userId: string, pedidoId: string) {
  await assertAdmin(userId);

  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .delete()
    .eq("id", pedidoId)
    .select("id, numero")
    .maybeSingle();

  if (error) throw new Error(`Falha ao excluir pedido: ${error.message}`);
  if (!data) throw new Error("Pedido não encontrado ou já foi excluído.");
  return data;
}

export async function atualizarStatusPedidoAdminServer(
  userId: string,
  input: { pedidoId: string; status: StatusKey; rastreio?: string | null },
) {
  await assertAdmin(userId);

  const rastreio = input.rastreio?.trim();
  if (input.status === "enviado" && !rastreio) {
    throw new Error("Informe o código de rastreio antes de marcar como enviado.");
  }

  const pedidoAntes = await supabaseAdmin
    .from("pedidos")
    .select("carrinho_abandonado, recuperacao_origem")
    .eq("id", input.pedidoId)
    .maybeSingle();

  const patch: any = {
    status: input.status,
    atualizado_em: new Date().toISOString(),
  };

  if (input.status === "enviado") patch.codigo_rastreio = rastreio;
  if (input.status === "pago") {
    patch.carrinho_abandonado = false;
    if (pedidoAntes.data?.carrinho_abandonado) {
      patch.recuperado_em = new Date().toISOString();
    }
  }

  const { data, error } = await supabaseAdmin
    .from("pedidos")
    .update(patch)
    .eq("id", input.pedidoId)
    .select(PEDIDO_SELECT)
    .maybeSingle();

  if (error) throw new Error(`Falha ao atualizar status: ${error.message}`);
  if (!data) throw new Error("Pedido não encontrado.");

  // Notifica o cliente quando o pedido é marcado como enviado
  if (input.status === "enviado" && data.email_contato) {
    void enviarEmailServer(
      data.email_contato,
      `🚚 Pedido #${data.numero} enviado — ELITE316`,
      htmlPedidoEnviado({
        nome: data.nome_contato ?? "",
        numero: data.numero,
        rastreio: rastreio,
      }),
    );
  }

  // Notifica o cliente quando o pagamento é confirmado
  if (input.status === "pago" && data.email_contato) {
    void enviarEmailServer(
      data.email_contato,
      `✅ Pagamento confirmado — Pedido #${data.numero} ELITE316`,
      htmlPagamentoConfirmado({
        nome: data.nome_contato ?? "",
        numero: data.numero,
        total: Number(data.total ?? 0),
      }),
    );
  }

  return {
    pedido: normalizePedido(data),
    emailQueued: Boolean(data.email_contato),
  };
}

export async function enviarRecuperacaoEmailAdminServer(userId: string, pedidoId: string) {
  await assertAdmin(userId);

  const { data: pedido, error: pedidoError } = await supabaseAdmin
    .from("pedidos")
    .select(PEDIDO_SELECT)
    .eq("id", pedidoId)
    .maybeSingle();

  if (pedidoError) throw new Error(`Falha ao localizar pedido: ${pedidoError.message}`);
  if (!pedido) throw new Error("Pedido não encontrado.");
  if (!pedido.email_contato) throw new Error("Pedido não possui e-mail de contato.");

  void enviarEmailServer(
    pedido.email_contato,
    `⏳ Seu carrinho ainda está disponível — Pedido #${pedido.numero} ELITE316`,
    htmlRecuperacaoCarrinho({
      nome: pedido.nome_contato ?? "",
      numero: pedido.numero,
      total: Number(pedido.total ?? 0),
      itens: (pedido.itens_pedido ?? []).map((item: any) => ({
        nome: item.nome_produto,
        quantidade: Number(item.quantidade ?? 0),
        preco_unit: Number(item.preco_unit ?? 0),
        comprimento: item.comprimento,
      })),
    }),
  );

  const { data: updated, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      abandoned_email_sent: true,
      recuperacao_origem: pedido.recuperacao_origem || "email_manual",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select(PEDIDO_SELECT)
    .maybeSingle();

  if (error) throw new Error(`Falha ao marcar pedido para recuperação: ${error.message}`);
  if (!updated) throw new Error("Pedido não encontrado após atualização.");

  return normalizePedido(updated);
}

export async function registrarOrigemRecuperacaoAdminServer(
  userId: string,
  pedidoId: string,
  origem: "email_manual" | "whatsapp" | "popup",
) {
  await assertAdmin(userId);

  const { data: pedido, error: pedidoError } = await supabaseAdmin
    .from("pedidos")
    .select("recuperacao_origem")
    .eq("id", pedidoId)
    .maybeSingle();

  if (pedidoError) throw new Error(`Falha ao localizar pedido: ${pedidoError.message}`);
  if (!pedido) throw new Error("Pedido não encontrado.");

  const { data: updated, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      recuperacao_origem: pedido.recuperacao_origem || origem,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select(PEDIDO_SELECT)
    .maybeSingle();

  if (error) throw new Error(`Falha ao registrar origem de recuperação: ${error.message}`);
  if (!updated) throw new Error("Pedido não encontrado após atualização.");

  return normalizePedido(updated);
}
