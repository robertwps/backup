ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS imagem_url TEXT;

UPDATE public.produtos
SET imagem_url = COALESCE(imagem_url, imagem_principal)
WHERE imagem_url IS NULL
  AND imagem_principal IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_produtos_imagem_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.imagem_url IS NULL AND NEW.imagem_principal IS NOT NULL THEN
      NEW.imagem_url := NEW.imagem_principal;
    ELSIF NEW.imagem_principal IS NULL AND NEW.imagem_url IS NOT NULL THEN
      NEW.imagem_principal := NEW.imagem_url;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.imagem_url IS DISTINCT FROM OLD.imagem_url
     AND NEW.imagem_principal IS NOT DISTINCT FROM OLD.imagem_principal THEN
    NEW.imagem_principal := NEW.imagem_url;
  ELSIF NEW.imagem_principal IS DISTINCT FROM OLD.imagem_principal
     AND NEW.imagem_url IS NOT DISTINCT FROM OLD.imagem_url THEN
    NEW.imagem_url := NEW.imagem_principal;
  ELSIF NEW.imagem_url IS NULL AND NEW.imagem_principal IS NOT NULL THEN
    NEW.imagem_url := NEW.imagem_principal;
  ELSIF NEW.imagem_principal IS NULL AND NEW.imagem_url IS NOT NULL THEN
    NEW.imagem_principal := NEW.imagem_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_produtos_imagem_columns_trigger ON public.produtos;
CREATE TRIGGER sync_produtos_imagem_columns_trigger
BEFORE INSERT OR UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.sync_produtos_imagem_columns();