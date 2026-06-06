-- Recover abandoned carts automatically and track recovery metadata.

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS abandoned_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recuperacao_origem TEXT,
  ADD COLUMN IF NOT EXISTS recuperado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pedidos_recuperacao_origem ON public.pedidos(recuperacao_origem);
CREATE INDEX IF NOT EXISTS idx_pedidos_recuperado_em ON public.pedidos(recuperado_em);

CREATE OR REPLACE FUNCTION public.enqueue_abandoned_cart_recovery()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  item_list TEXT;
  total_label TEXT;
BEGIN
  FOR rec IN
    SELECT
      p.id,
      p.email_contato,
      p.nome_contato,
      p.numero,
      p.total,
      STRING_AGG(i.nome_produto || ' x' || i.quantidade, ' · ' ORDER BY i.id) AS itens
    FROM public.pedidos p
    LEFT JOIN public.itens_pedido i ON i.pedido_id = p.id
    WHERE p.carrinho_abandonado = TRUE
      AND p.status = 'pendente'
      AND p.email_contato IS NOT NULL
      AND p.abandoned_email_sent = FALSE
      AND p.criado_em <= now() - interval '48 hours'
    GROUP BY p.id
  LOOP
    item_list := COALESCE(rec.itens, 'itens selecionados');
    total_label := format('R$ %s', replace(to_char(rec.total, 'FM999G999D00'), '.', ','));

    PERFORM public.enqueue_email(
      'transactional_emails',
      jsonb_build_object(
        'to', rec.email_contato,
        'from', 'contato@elite316.com.br',
        'sender_domain', 'elite316.com.br',
        'subject', format('Seu carrinho de %s ainda está reservado', total_label),
        'html', format(
          '<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table width="100%%" cellpadding="0" cellspacing="0" style="padding:24px"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden"><tr><td style="background:#0f172a;padding:28px;color:#fff;font-size:24px;font-weight:700;">Seu carrinho está quase lá</td></tr><tr><td style="padding:24px;color:#1f2937"><p style="margin:0 0 16px;font-size:16px;">Olá %s, notamos que você deixou um carrinho de <strong>%s</strong> pendente.</p><p style="margin:0 0 16px;font-size:15px;"><strong>Itens:</strong> %s</p><p style="margin:0 0 24px;font-size:15px;">Finalize agora com <strong>5%% OFF</strong> usando o cupom <strong>VOLTA5</strong>.</p><p style="margin:0;font-size:15px;">Clique no botão abaixo para voltar e concluir sua compra antes que os produtos saiam do estoque.</p><p style="margin:24px 0 0;"><a href="https://elite316.com.br/checkout" style="background:#0f172a;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:700;">Completar pedido</a></p></td></tr><tr><td style="background:#f8fafc;padding:18px 24px;color:#64748b;font-size:12px;">ELITE316 — Recuperação de carrinhos abandonados.</td></tr></table></td></tr></table></body></html>',
          coalesce(rec.nome_contato, 'cliente'),
          total_label,
          item_list
        ),
        'text', format(
          'Olá %s, você deixou um carrinho de %s com %s. Finalize agora com 5%% OFF usando o cupom VOLTA5. Acesse https://elite316.com.br/checkout',
          coalesce(rec.nome_contato, 'cliente'),
          total_label,
          item_list
        ),
        'purpose', 'transactional',
        'label', 'abandoned_cart_recovery',
        'idempotency_key', gen_random_uuid(),
        'message_id', gen_random_uuid()
      )
    );

    UPDATE public.pedidos
    SET
      abandoned_email_sent = TRUE,
      recuperacao_origem = COALESCE(recuperacao_origem, 'email_automatico'),
      atualizado_em = now()
    WHERE id = rec.id;
  END LOOP;

  RETURN FOUND::int;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'abandoned_cart_recovery') THEN
    PERFORM cron.schedule(
      'abandoned_cart_recovery',
      '0 * * * *',
      'SELECT public.enqueue_abandoned_cart_recovery();'
    );
  END IF;
END $$;
