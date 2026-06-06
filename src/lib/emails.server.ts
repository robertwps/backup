// Envio de e-mails a partir do server (server functions). Faz fetch para a
// Edge Function `enviar-email` que envia via SMTP do Zoho.
// Falhas são logadas e silenciadas — nunca devem quebrar o fluxo do pedido.

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";

export async function enviarEmailServer(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!to || !SUPABASE_URL) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/enviar-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    if (!res.ok) {
      console.error("[enviarEmailServer] status", res.status, await res.text());
    }
  } catch (err) {
    console.error("[enviarEmailServer] falhou", err);
  }
}
