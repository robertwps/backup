
-- 1) Restrict coupons SELECT to admins only
DROP POLICY IF EXISTS "cupons_public_read_active" ON public.cupons;

-- 2) Tighten pedidos INSERT: anon -> cliente_id IS NULL; auth -> cliente_id = auth.uid()
DROP POLICY IF EXISTS "pedidos_insert_any" ON public.pedidos;
CREATE POLICY "pedidos_insert_own_or_guest" ON public.pedidos
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND cliente_id IS NULL)
    OR (auth.uid() IS NOT NULL AND cliente_id = auth.uid())
  );

-- 3) Tighten itens_pedido INSERT: must reference a pedido the caller can see
DROP POLICY IF EXISTS "itens_insert_any" ON public.itens_pedido;
CREATE POLICY "itens_insert_own_pedido" ON public.itens_pedido
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedidos p
      WHERE p.id = itens_pedido.pedido_id
        AND (
          (auth.uid() IS NULL AND p.cliente_id IS NULL)
          OR (auth.uid() IS NOT NULL AND (p.cliente_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)))
        )
    )
  );

-- 4) Hide preco_custo from anon (column-level)
REVOKE SELECT ON public.produtos FROM anon;
GRANT SELECT (id, nome, slug, descricao, preco, preco_promocional, imagem_url,
              imagem_principal, material, ativo, destaque, categoria_id, sku,
              criado_em, estoque_minimo, categoria_id)
  ON public.produtos TO anon;

-- 5) Hide raw estoque from anon (column-level)
REVOKE SELECT ON public.variantes_produto FROM anon;
GRANT SELECT (id, produto_id, comprimento, criado_em)
  ON public.variantes_produto TO anon;

-- 6) Lock down has_role from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 7) Disable storage listing on public buckets (direct file URLs still work)
DROP POLICY IF EXISTS "products_public_read" ON storage.objects;
DROP POLICY IF EXISTS "produtos_bucket_public_read" ON storage.objects;
