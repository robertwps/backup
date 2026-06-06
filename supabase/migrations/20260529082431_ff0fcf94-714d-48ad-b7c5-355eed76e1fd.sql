
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS preco_custo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estoque_minimo integer NOT NULL DEFAULT 5;

-- Preenche SKU para produtos existentes
UPDATE public.produtos
SET sku = 'SKU-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE sku IS NULL;

-- Unicidade após backfill
CREATE UNIQUE INDEX IF NOT EXISTS produtos_sku_unique ON public.produtos (sku);
