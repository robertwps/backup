import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verificarPagamentoAsaasServer } from "@/lib/asaas-status.server";

export const verificarPagamentoAsaas = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ paymentId: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => verificarPagamentoAsaasServer(data.paymentId));
