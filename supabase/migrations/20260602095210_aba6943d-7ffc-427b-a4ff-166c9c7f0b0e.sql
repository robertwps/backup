
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_notifications_admin_select ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY admin_notifications_admin_update ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY admin_notifications_admin_delete ON public.admin_notifications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.notify_new_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (title, message, type, metadata)
  VALUES (
    'Novo cliente cadastrado',
    COALESCE(NEW.nome_completo, NEW.email, 'Novo cliente') || ' acabou de criar uma conta.',
    'cadastro',
    jsonb_build_object('cliente_id', NEW.id, 'email', NEW.email)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_cliente ON public.clientes;
CREATE TRIGGER trg_notify_new_cliente
  AFTER INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_cliente();

CREATE OR REPLACE FUNCTION public.notify_new_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (title, message, type, metadata)
  VALUES (
    'Novo pedido #' || NEW.numero,
    COALESCE(NEW.nome_contato, 'Cliente') || ' realizou um pedido de R$ ' || to_char(NEW.total, 'FM999G999G990D00'),
    'compra',
    jsonb_build_object('pedido_id', NEW.id, 'numero', NEW.numero, 'total', NEW.total)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_pedido ON public.pedidos;
CREATE TRIGGER trg_notify_new_pedido
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_pedido();
