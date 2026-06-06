import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { redefinirSenhaComToken } from "@/lib/recuperacao-senha.functions";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({ meta: [{ title: "Redefinir Senha — ELITE316" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/redefinir-senha" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const ready = Boolean(token && token.length >= 32);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z
      .object({ password: z.string().min(6, "Mínimo 6 caracteres").max(72), confirm: z.string() })
      .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não coincidem" })
      .safeParse({ password, confirm });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (!token) { toast.error("Link inválido."); return; }
    setSubmitting(true);
    try {
      await redefinirSenhaComToken({ data: { token, novaSenha: parsed.data.password } });
      toast.success("Senha alterada com sucesso! Faça login com a nova senha.");
      setTimeout(() => navigate({ to: "/minha-conta" }), 800);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao redefinir a senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Recuperação</p>
            <h1 className="mt-2 font-display text-4xl">Redefinir Senha</h1>
            <p className="mt-2 text-sm text-muted-foreground">Defina uma nova senha para sua conta.</p>
          </div>
          <Card className="border-border bg-card p-6">
            {!ready ? (
              <p className="text-center text-sm text-muted-foreground">
                Link inválido ou expirado. Solicite uma nova recuperação na tela de login.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="np">Nova senha</Label>
                  <div className="relative">
                    <Input id="np" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pr-10" />
                    <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="np2">Repetir senha</Label>
                  <Input id="np2" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-gold text-gold-foreground hover:bg-gold/90 uppercase tracking-widest">
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : "Salvar nova senha"}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
