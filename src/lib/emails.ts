// Templates HTML simples para e-mails transacionais.
// Disparados via enviarEmailServer (SMTP Zoho na Edge Function `enviar-email`).

const BRAND = "ELITE316";
const COLOR_PRIMARY = "#0a0a0a";
const COLOR_ACCENT = "#c9a227";

function layout(title: string, inner: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:${COLOR_PRIMARY};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:${COLOR_PRIMARY};padding:20px 24px;color:#fff;font-weight:700;font-size:18px;letter-spacing:2px;">${BRAND}</td></tr>
        <tr><td style="padding:24px;font-size:15px;line-height:1.55;">${inner}</td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;color:#777;font-size:12px;">© ${new Date().getFullYear()} ${BRAND}. Este é um e-mail automático.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
}

export function htmlBoasVindas(nome: string) {
  return layout(
    "Bem-vindo",
    `<h2 style="margin:0 0 12px;">Olá, ${nome} 👋</h2>
     <p>Sua conta na <b>${BRAND}</b> foi criada com sucesso.</p>
     <p>Estamos felizes em ter você por aqui.</p>`,
  );
}

export function htmlPerfilAtualizado(args: { nome: string; alteracoes: string[] }) {
  const itens = args.alteracoes.length
    ? `<ul>${args.alteracoes.map((a) => `<li>${a}</li>`).join("")}</ul>`
    : `<p>Seu perfil foi atualizado.</p>`;
  return layout(
    "Perfil atualizado",
    `<h2 style="margin:0 0 12px;">Olá, ${args.nome}</h2>
     <p>As seguintes informações do seu perfil foram atualizadas:</p>
     ${itens}`,
  );
}

export function htmlRedefinirSenha(args: { nome: string; link: string }) {
  return layout(
    "Redefinição de senha",
    `<h2 style="margin:0 0 12px;">Olá${args.nome ? `, ${args.nome}` : ""}</h2>
     <p>Recebemos um pedido para redefinir a senha da sua conta na <b>${BRAND}</b>.</p>
     <p>Clique no botão abaixo para criar uma nova senha. O link expira em <b>60 minutos</b>.</p>
     <p style="margin:24px 0;">
       <a href="${args.link}" style="background:${COLOR_PRIMARY};color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:600;letter-spacing:1px;">REDEFINIR SENHA</a>
     </p>
     <p style="font-size:12px;color:#777;">Se você não solicitou esta alteração, ignore este e-mail — sua senha permanece a mesma.</p>
     <p style="font-size:12px;color:#777;word-break:break-all;">Ou copie e cole no navegador:<br>${args.link}</p>`,
  );
}

type ItemPedido = {
  nome: string;
  quantidade: number;
  preco_unit: number;
  comprimento?: number | string | null;
};

function tabelaItens(itens: ItemPedido[]) {
  const linhas = itens
    .map(
      (i) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.nome}${i.comprimento ? ` (${i.comprimento}cm)` : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${i.quantidade}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${brl(i.preco_unit)}</td>
      </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:12px 0;">
    <thead><tr style="background:#fafafa;">
      <th align="left" style="padding:8px;">Item</th>
      <th style="padding:8px;">Qtd</th>
      <th align="right" style="padding:8px;">Preço</th>
    </tr></thead>
    <tbody>${linhas}</tbody>
  </table>`;
}

export function htmlPedidoConfirmado(args: {
  nome: string;
  numero: string | number;
  total: number;
  pixCopiaCola?: string | null;
  qrCodeImage?: string | null;
  itens: ItemPedido[];
}) {
  const pix = args.pixCopiaCola
    ? `<h3 style="margin:16px 0 8px;">Pague com PIX</h3>
       ${args.qrCodeImage ? `<p><img src="${args.qrCodeImage}" alt="QR Code PIX" width="200" height="200" style="display:block;"></p>` : ""}
       <p style="font-size:12px;color:#555;">Copia e cola:</p>
       <pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:11px;white-space:pre-wrap;word-break:break-all;">${args.pixCopiaCola}</pre>`
    : "";
  return layout(
    "Pedido recebido",
    `<h2 style="margin:0 0 12px;">Pedido #${args.numero} recebido</h2>
     <p>Olá ${args.nome}, recebemos seu pedido. Assim que confirmarmos o pagamento, ele entra em produção.</p>
     ${tabelaItens(args.itens)}
     <p style="text-align:right;font-size:16px;"><b>Total: ${brl(args.total)}</b></p>
     ${pix}`,
  );
}

export function htmlPagamentoConfirmado(args: { nome: string; numero: string | number; total: number }) {
  return layout(
    "Pagamento confirmado",
    `<h2 style="margin:0 0 12px;color:${COLOR_ACCENT};">✅ Pagamento confirmado</h2>
     <p>Olá ${args.nome}, recebemos o pagamento do seu pedido <b>#${args.numero}</b> no valor de <b>${brl(args.total)}</b>.</p>
     <p>Seu pedido entrou em produção. Em breve avisaremos quando for despachado.</p>`,
  );
}

export function htmlPedidoEnviado(args: { nome: string; numero: string | number; rastreio?: string | null }) {
  const cod = args.rastreio
    ? `<p>Código de rastreio: <b>${args.rastreio}</b></p>`
    : `<p>Em breve você receberá o código de rastreio.</p>`;
  return layout(
    "Pedido enviado",
    `<h2 style="margin:0 0 12px;">🚚 Pedido #${args.numero} enviado</h2>
     <p>Olá ${args.nome}, seu pedido foi despachado!</p>
     ${cod}`,
  );
}
