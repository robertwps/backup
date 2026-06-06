CREATE TABLE public.combo_settings (
  id INT PRIMARY KEY DEFAULT 1,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  desconto NUMERIC NOT NULL DEFAULT 15,
  ativo BOOLEAN NOT NULL DEFAULT true,
  titulo TEXT NOT NULL DEFAULT 'Combine e Ganhe Desconto',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT combo_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.combo_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.combo_settings TO authenticated;
GRANT ALL ON public.combo_settings TO service_role;

ALTER TABLE public.combo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Combo settings são públicos para leitura"
ON public.combo_settings FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem alterar combo settings"
ON public.combo_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.combo_settings (id, desconto, ativo, titulo)
VALUES (1, 15, false, 'Combine e Ganhe Desconto')
ON CONFLICT (id) DO NOTHING;