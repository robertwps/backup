import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export async function excluirClienteAdminServer(adminUserId: string, clienteId: string) {
  await assertAdmin(adminUserId);

  // Apaga registros relacionados que não cascateiam automaticamente
  await supabaseAdmin.from("enderecos").delete().eq("cliente_id", clienteId);
  // Pedidos: mantém o histórico mas remove vínculo com o cliente
  await supabaseAdmin.from("pedidos").update({ cliente_id: null }).eq("cliente_id", clienteId);

  // Remove o registro da tabela clientes
  const { error: cliErr } = await supabaseAdmin.from("clientes").delete().eq("id", clienteId);
  if (cliErr) throw new Error(`Falha ao excluir cliente: ${cliErr.message}`);

  // Remove o usuário em auth.users (impede login). Ignora falha se já não existir.
  try {
    await supabaseAdmin.auth.admin.deleteUser(clienteId);
  } catch (err) {
    console.error("[excluirCliente] auth.admin.deleteUser", err);
  }

  return { ok: true, id: clienteId };
}
