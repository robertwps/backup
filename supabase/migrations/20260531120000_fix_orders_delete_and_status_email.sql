-- Corrige exclusão real de pedidos e registra aviso por e-mail em toda mudança de status.

GRANT DELETE ON public.pedidos TO authenticated;

DROP POLICY IF EXISTS "pedidos_admin_delete" ON public.pedidos;
CREATE POLICY "pedidos_admin_delete"
ON public.pedidos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_pedido_cancelado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_label text;
  assunto_email text;
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status <> 'cancelado' THEN
    UPDATE public.variantes_produto v
    SET estoque = estoque + i.quantidade
    FROM public.itens_pedido i
    WHERE i.pedido_id = NEW.id AND i.variante_id = v.id;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.email_contato IS NOT NULL THEN
    status_label := CASE NEW.status
      WHEN 'pendente' THEN 'Pedido pendente'
      WHEN 'pago' THEN 'Pagamento aprovado'
      WHEN 'em_separacao' THEN 'Pedido em separação'
      WHEN 'enviado' THEN 'Pedido enviado'
      WHEN 'entregue' THEN 'Pedido entregue'
      WHEN 'cancelado' THEN 'Compra cancelada'
      ELSE NEW.status
    END;

    assunto_email := CASE NEW.status
      WHEN 'enviado' THEN 'Seu pedido da ELITE316 foi enviado 🚚'
      WHEN 'pago' THEN 'Pagamento aprovado — ELITE316'
      WHEN 'cancelado' THEN 'Atualização do seu pedido ELITE316'
      ELSE 'Status do seu pedido ELITE316 atualizado'
    END;

    INSERT INTO public.fila_emails (destinatario, assunto, corpo_html)
    VALUES (
      NEW.email_contato,
      assunto_email,
      '<div style="background:#0a0a0a;color:#e5e5e5;padding:32px;font-family:Arial,sans-serif;line-height:1.55">' ||
      '<div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #2d2d2d;border-radius:14px;overflow:hidden">' ||
      '<div style="padding:24px 28px;background:#151515;border-bottom:1px solid #2d2d2d">' ||
      '<div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c">ELITE316</div>' ||
      '<h1 style="margin:10px 0 0;color:#ffffff;font-size:24px">' || status_label || '</h1>' ||
      '</div><div style="padding:28px">' ||
      '<p>Olá, <strong>' || COALESCE(NEW.nome_contato, 'cliente') || '</strong>!</p>' ||
      '<p>O status do seu pedido <strong>#' || NEW.numero || '</strong> foi atualizado para <strong style="color:#c9a84c">' || status_label || '</strong>.</p>' ||
      CASE WHEN NEW.status = 'enviado' AND NEW.codigo_rastreio IS NOT NULL
        THEN '<p>Código de rastreio: <strong style="color:#93c5fd">' || NEW.codigo_rastreio || '</strong></p>'
        ELSE ''
      END ||
      '<p>Total do pedido: <strong>R$ ' || NEW.total || '</strong></p>' ||
      '<p style="margin-top:24px;color:#a3a3a3;font-size:13px">Qualquer dúvida, responda este e-mail ou fale com nossa equipe.</p>' ||
      '</div></div></div>'
    );
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;
