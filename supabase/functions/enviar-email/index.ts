// Edge Function: envia e-mails transacionais via SMTP do Zoho Mail.
// Chamada pelo backend (server functions) e pelo front (supabase.functions.invoke).
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM_ADDRESS = Deno.env.get("ZOHO_SMTP_USER") ?? "no-reply@elite316.com.br";
const FROM_NAME = "ELITE316";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = (await req.json()) as {
      to?: string;
      subject?: string;
      html?: string;
    };

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'to', 'subject' e 'html' são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const host = Deno.env.get("ZOHO_SMTP_HOST");
    const portStr = Deno.env.get("ZOHO_SMTP_PORT") ?? "465";
    const user = Deno.env.get("ZOHO_SMTP_USER");
    const pass = Deno.env.get("ZOHO_SMTP_PASSWORD");

    if (!host || !user || !pass) {
      return new Response(
        JSON.stringify({ error: "Credenciais SMTP Zoho não configuradas." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const port = Number(portStr);

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port,
        tls: port === 465,
        auth: { username: user, password: pass },
      },
    });

    await client.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to,
      subject,
      content: "Visualize este e-mail em um cliente compatível com HTML.",
      html,
    });
    await client.close();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[enviar-email] erro", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
