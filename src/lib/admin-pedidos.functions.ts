import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  atualizarStatusPedidoAdminServer,
  excluirPedidoAdminServer,
  listarPedidosAdminServer,
} from "@/lib/admin-pedidos.server";

const statusSchema = z.enum(["pendente", "pago", "em_separacao", "enviado", "entregue", "cancelado"]);

export const listarPedidosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listarPedidosAdminServer(context.userId));

export const excluirPedidoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ pedidoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => excluirPedidoAdminServer(context.userId, data.pedidoId));

export const atualizarStatusPedidoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        pedidoId: z.string().uuid(),
        status: statusSchema,
        rastreio: z.string().max(80).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => atualizarStatusPedidoAdminServer(context.userId, data));