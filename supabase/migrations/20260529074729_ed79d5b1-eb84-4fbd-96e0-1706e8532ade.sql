
-- =====================================================
-- ROLES SYSTEM
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- CATEGORIAS
-- =====================================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  imagem_url TEXT,
  ordem INT NOT NULL DEFAULT 0,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categorias TO anon, authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_public_read" ON public.categorias FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categorias_admin_all" ON public.categorias FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- PRODUTOS
-- =====================================================
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_promocional NUMERIC(10,2),
  material TEXT NOT NULL DEFAULT 'Aço Inoxidável 316L',
  destaque BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
GRANT SELECT ON public.produtos TO anon, authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos_public_read" ON public.produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "produtos_admin_all" ON public.produtos FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- VARIANTES PRODUTO (tamanhos)
-- =====================================================
CREATE TABLE public.variantes_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  comprimento TEXT NOT NULL CHECK (comprimento IN ('50cm','55cm','60cm','65cm','70cm','75cm','80cm')),
  estoque INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (produto_id, comprimento)
);
CREATE INDEX idx_variantes_produto ON public.variantes_produto(produto_id);
GRANT SELECT ON public.variantes_produto TO anon, authenticated;
GRANT ALL ON public.variantes_produto TO service_role;
ALTER TABLE public.variantes_produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variantes_public_read" ON public.variantes_produto FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "variantes_admin_all" ON public.variantes_produto FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- IMAGENS PRODUTO
-- =====================================================
CREATE TABLE public.imagens_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  url_storage TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 1,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_imagens_produto ON public.imagens_produto(produto_id, ordem);
GRANT SELECT ON public.imagens_produto TO anon, authenticated;
GRANT ALL ON public.imagens_produto TO service_role;
ALTER TABLE public.imagens_produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imagens_public_read" ON public.imagens_produto FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "imagens_admin_all" ON public.imagens_produto FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- CUPONS
-- =====================================================
CREATE TABLE public.cupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('porcentagem','valor_fixo')),
  valor NUMERIC(10,2) NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cupons TO anon, authenticated;
GRANT ALL ON public.cupons TO service_role;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cupons_public_read_active" ON public.cupons FOR SELECT TO anon, authenticated USING (ativa = true);
CREATE POLICY "cupons_admin_all" ON public.cupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- CLIENTES (perfil)
-- =====================================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT,
  email TEXT,
  telefone TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_self_select" ON public.clientes FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clientes_self_upsert" ON public.clientes FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "clientes_self_update" ON public.clientes FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "clientes_admin_delete" ON public.clientes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Trigger: cria perfil + role 'cliente' ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.clientes (id, email, nome_completo)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ENDERECOS
-- =====================================================
CREATE TABLE public.enderecos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cep TEXT NOT NULL,
  rua TEXT NOT NULL,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enderecos_cliente ON public.enderecos(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enderecos TO authenticated;
GRANT ALL ON public.enderecos TO service_role;
ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enderecos_self_all" ON public.enderecos FOR ALL TO authenticated USING (cliente_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (cliente_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =====================================================
-- PEDIDOS
-- =====================================================
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  endereco_id UUID REFERENCES public.enderecos(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  frete NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  cupom_codigo TEXT,
  frete_tipo TEXT,
  metodo_pagamento TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','pago','em_separacao','enviado','entregue','cancelado')),
  codigo_rastreio TEXT,
  carrinho_abandonado BOOLEAN NOT NULL DEFAULT true,
  email_contato TEXT,
  telefone_contato TEXT,
  nome_contato TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_abandono ON public.pedidos(carrinho_abandonado);
GRANT SELECT, INSERT, UPDATE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_self_select" ON public.pedidos FOR SELECT TO authenticated USING (cliente_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pedidos_self_insert" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (cliente_id = auth.uid() OR cliente_id IS NULL);
CREATE POLICY "pedidos_admin_update" ON public.pedidos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
-- guests podem criar pedido (carrinho abandonado / checkout sem login)
CREATE POLICY "pedidos_anon_insert" ON public.pedidos FOR INSERT TO anon WITH CHECK (cliente_id IS NULL);
GRANT INSERT ON public.pedidos TO anon;

-- =====================================================
-- ITENS PEDIDO
-- =====================================================
CREATE TABLE public.itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  variante_id UUID REFERENCES public.variantes_produto(id) ON DELETE SET NULL,
  nome_produto TEXT NOT NULL,
  comprimento TEXT,
  quantidade INT NOT NULL DEFAULT 1,
  preco_unit NUMERIC(10,2) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_itens_pedido ON public.itens_pedido(pedido_id);
GRANT SELECT, INSERT ON public.itens_pedido TO authenticated, anon;
GRANT ALL ON public.itens_pedido TO service_role;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_via_pedido_select" ON public.itens_pedido FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (p.cliente_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);
CREATE POLICY "itens_insert_any" ON public.itens_pedido FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "itens_admin_all" ON public.itens_pedido FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- FILA DE E-MAILS
-- =====================================================
CREATE TABLE public.fila_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario TEXT NOT NULL,
  assunto TEXT NOT NULL,
  corpo_html TEXT NOT NULL,
  enviado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_em TIMESTAMPTZ
);
GRANT SELECT ON public.fila_emails TO authenticated;
GRANT ALL ON public.fila_emails TO service_role;
ALTER TABLE public.fila_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fila_admin_all" ON public.fila_emails FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================
-- STORAGE BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('produtos-bucket', 'produtos-bucket', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "produtos_bucket_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'produtos-bucket');
CREATE POLICY "produtos_bucket_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produtos-bucket' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "produtos_bucket_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'produtos-bucket' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "produtos_bucket_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'produtos-bucket' AND public.has_role(auth.uid(),'admin'));
-- service_role bypassa RLS, então seed funciona

-- =====================================================
-- TRIGGER: cancelar pedido devolve estoque
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_pedido_cancelado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelado' AND OLD.status <> 'cancelado' THEN
    UPDATE public.variantes_produto v
    SET estoque = estoque + i.quantidade
    FROM public.itens_pedido i
    WHERE i.pedido_id = NEW.id AND i.variante_id = v.id;
  END IF;
  IF NEW.status = 'enviado' AND OLD.status <> 'enviado' AND NEW.codigo_rastreio IS NOT NULL AND NEW.email_contato IS NOT NULL THEN
    INSERT INTO public.fila_emails (destinatario, assunto, corpo_html)
    VALUES (
      NEW.email_contato,
      'Boas notícias! Seu pedido da ELITE316 foi enviado 🚀',
      '<div style="background:#0a0a0a;color:#e5e5e5;padding:32px;font-family:sans-serif;"><h1 style="color:#c9a84c;">Pedido enviado!</h1><p>Olá, ' || COALESCE(NEW.nome_contato,'cliente') || '!</p><p>Sua peça em Aço 316L está a caminho.</p><p><strong>Código de rastreio:</strong> ' || NEW.codigo_rastreio || '</p><p>Pedido #' || NEW.numero || ' — Total R$ ' || NEW.total || '</p></div>'
    );
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_pedido_status
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.handle_pedido_cancelado();
