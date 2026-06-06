-- Create customer notifications table and new-product trigger

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.produtos(id) ON DELETE SET NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_self_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "notifications_self_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_self_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_all" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.notify_new_product() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (id, user_id, title, message, product_id, created_at)
  SELECT
    gen_random_uuid(),
    c.id,
    format('Novo produto: %s', NEW.nome),
    format(
      'O produto %s já está disponível por apenas R$ %s. Confira agora!',
      NEW.nome,
      to_char(coalesce(NEW.preco_promocional, NEW.preco), 'FM99999999990D00', 'NLS_NUMERIC_CHARACTERS='',.''')
    ),
    NEW.id,
    now()
  FROM public.clientes c;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_new_product
  AFTER INSERT ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_product();
