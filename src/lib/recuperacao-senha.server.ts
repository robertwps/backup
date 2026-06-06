import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enviarEmailServer } from "@/lib/emails.server";
import { htmlRedefinirSenha } from "@/lib/emails";

const TOKEN_TTL_MIN = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSiteUrl() {
  return (
    process.env.SITE_URL ??
    process.env.PUBLIC_SITE_URL ??
    "https://elite316.com.br"
  );
}

export async function solicitarRecuperacaoSenhaServer(email: string) {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return { ok: true };

  // Busca usuário por e-mail (admin API). Resposta é sempre "ok" para não revelar existência.
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error("[recuperacao] listUsers", listErr);
    return { ok: true };
  }
  const user = list?.users?.find((u) => u.email?.toLowerCase() === emailNorm);
  if (!user) return { ok: true };

  // Busca nome do cliente para personalizar
  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("nome_completo")
    .eq("id", user.id)
    .maybeSingle();

  // Gera token aleatório (32 bytes) e armazena só o hash
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString();

  // Invalida tokens anteriores não usados
  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("used_at", null);

  const { error: insertErr } = await supabaseAdmin
    .from("password_reset_tokens")
    .insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });
  if (insertErr) {
    console.error("[recuperacao] insert token", insertErr);
    return { ok: true };
  }

  const link = `${getSiteUrl().replace(/\/$/, "")}/redefinir-senha?token=${token}`;

  await enviarEmailServer(
    emailNorm,
    "Redefinição de senha — ELITE316",
    htmlRedefinirSenha({ nome: cliente?.nome_completo ?? "", link }),
  );

  return { ok: true };
}

export async function redefinirSenhaComTokenServer(token: string, novaSenha: string) {
  if (!token || token.length < 32) throw new Error("Token inválido.");
  if (!novaSenha || novaSenha.length < 6) throw new Error("A senha precisa ter no mínimo 6 caracteres.");

  const tokenHash = hashToken(token);

  const { data: row, error } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) throw new Error("Falha ao validar o token. Tente novamente.");
  if (!row) throw new Error("Link inválido ou já utilizado. Solicite uma nova recuperação.");
  if (row.used_at) throw new Error("Este link já foi utilizado. Solicite uma nova recuperação.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error("Link expirado. Solicite uma nova recuperação de senha.");
  }

  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
    password: novaSenha,
  });
  if (updErr) throw new Error(updErr.message || "Falha ao atualizar a senha.");

  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true };
}
