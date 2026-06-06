import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enviarEmailServer } from "@/lib/emails.server";
import { htmlPerfilAtualizado } from "@/lib/emails";

const enderecoSchema = z
  .object({
    cep: z.string().min(8).max(10),
    rua: z.string().min(1).max(200),
    numero: z.string().min(1).max(20),
    complemento: z.string().max(120).optional().nullable(),
    bairro: z.string().min(1).max(120),
    cidade: z.string().min(1).max(120),
    estado: z.string().min(2).max(2),
  })
  .optional()
  .nullable();

export const atualizarPerfilCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nome_completo: z.string().min(2).max(120),
        telefone: z.string().max(25).optional().nullable(),
        endereco: enderecoSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: anterior } = await supabase
      .from("clientes")
      .select("nome_completo, telefone, email")
      .eq("id", userId)
      .maybeSingle();

    const alteracoes: string[] = [];
    if ((anterior?.nome_completo ?? "") !== data.nome_completo) alteracoes.push("Nome completo");
    const novoTel = (data.telefone ?? "").replace(/\D/g, "");
    const antTel = (anterior?.telefone ?? "").replace(/\D/g, "");
    if (antTel !== novoTel) alteracoes.push("Telefone");

    const { error: clienteError } = await supabase
      .from("clientes")
      .update({
        nome_completo: data.nome_completo,
        telefone: novoTel || null,
      })
      .eq("id", userId);
    if (clienteError) throw new Error(`Falha ao atualizar perfil: ${clienteError.message}`);

    if (data.endereco) {
      const cepDigits = data.endereco.cep.replace(/\D/g, "");
      const enderecoPayload = {
        cliente_id: userId,
        cep: cepDigits,
        rua: data.endereco.rua,
        numero: data.endereco.numero,
        complemento: data.endereco.complemento || null,
        bairro: data.endereco.bairro,
        cidade: data.endereco.cidade,
        estado: data.endereco.estado.toUpperCase(),
      };

      const { data: enderecoAtual } = await supabase
        .from("enderecos")
        .select("*")
        .eq("cliente_id", userId)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      let endChanged = !enderecoAtual;
      if (enderecoAtual) {
        endChanged =
          (enderecoAtual.cep ?? "").replace(/\D/g, "") !== cepDigits ||
          (enderecoAtual.rua ?? "") !== enderecoPayload.rua ||
          (enderecoAtual.numero ?? "") !== enderecoPayload.numero ||
          (enderecoAtual.complemento ?? "") !== (enderecoPayload.complemento ?? "") ||
          (enderecoAtual.bairro ?? "") !== enderecoPayload.bairro ||
          (enderecoAtual.cidade ?? "") !== enderecoPayload.cidade ||
          (enderecoAtual.estado ?? "") !== enderecoPayload.estado;
      }
      if (endChanged) alteracoes.push("Endereço de entrega");

      if (enderecoAtual?.id) {
        await supabase.from("enderecos").update(enderecoPayload).eq("id", enderecoAtual.id);
      } else {
        await supabase.from("enderecos").insert(enderecoPayload);
      }
    }

    if (alteracoes.length > 0 && anterior?.email) {
      void enviarEmailServer(
        anterior.email,
        "🔐 Seus dados na ELITE316 foram atualizados",
        htmlPerfilAtualizado({ nome: data.nome_completo, alteracoes }),
      );
    }

    return { ok: true, alteracoes };
  });
