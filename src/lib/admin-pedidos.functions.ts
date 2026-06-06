import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  atualizarStatusPedidoAdminServer,
  enviarRecuperacaoEmailAdminServer,
  excluirPedidoAdminServer,
  listarPedidosAdminServer,
  registrarOrigemRecuperacaoAdminServer,
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

export const enviarRecuperacaoEmailAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ pedidoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) =>
    enviarRecuperacaoEmailAdminServer(context.userId, data.pedidoId),
  );

export const registrarOrigemRecuperacaoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        pedidoId: z.string().uuid(),
        origem: z.enum(["email_manual", "whatsapp", "popup"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    registrarOrigemRecuperacaoAdminServer(context.userId, data.pedidoId, data.origem),
  );