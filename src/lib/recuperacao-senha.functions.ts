import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  redefinirSenhaComTokenServer,
  solicitarRecuperacaoSenhaServer,
} from "@/lib/recuperacao-senha.server";

export const solicitarRecuperacaoSenha = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ email: z.string().trim().email().max(255) }).parse(input),
  )
  .handler(async ({ data }) => solicitarRecuperacaoSenhaServer(data.email));

export const redefinirSenhaComToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().min(32).max(256),
        novaSenha: z.string().min(6).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => redefinirSenhaComTokenServer(data.token, data.novaSenha));
