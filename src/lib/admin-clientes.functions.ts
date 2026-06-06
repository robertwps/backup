import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { excluirClienteAdminServer } from "@/lib/admin-clientes.server";

export const excluirClienteAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ clienteId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) =>
    excluirClienteAdminServer(context.userId, data.clienteId),
  );
