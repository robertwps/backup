import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  LogOut,
  Package,
  User as UserIcon,
  Crown,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { solicitarRecuperacaoSenha } from "@/lib/recuperacao-senha.functions";

function AppleSignInButton() {
  const [loading, setLoading] = useState(false);
  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin + "/minha-conta",
      });
      if (result.error) {
        toast.error("Não foi possível entrar com a Apple. Tente novamente.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      window.location.reload();
    } catch {
      toast.error("Erro ao conectar com a Apple.");
      setLoading(false);
    }
  };
  return (
    <>
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-platinum/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-widest">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>
      <Button
        type="button"
        onClick={handleAppleSignIn}
        disabled={loading}
        variant="outline"
        className="w-full bg-black text-white hover:bg-black/90 hover:text-white border-black uppercase tracking-widest"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continuar com Apple
          </>
        )}
      </Button>
    </>
  );
}

function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/minha-conta",
      });
      if (result.error) {
        toast.error("Não foi possível entrar com o Google. Tente novamente.");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      window.location.reload();
    } catch {
      toast.error("Erro ao conectar com o Google.");
      setLoading(false);
    }
  };
  return (
    <Button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      variant="outline"
      className="w-full bg-white text-black hover:bg-gray-50 border-gray-300 uppercase tracking-widest"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </>
      )}
    </Button>
  );
}
import { useServerFn } from "@tanstack/react-start";
import { atualizarPerfilCliente } from "@/lib/perfil.functions";
import { htmlBoasVindas } from "@/lib/emails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha Conta — ELITE316" },
      {
        name: "description",
        content: "Acesse sua conta ELITE316, acompanhe seus pedidos e gerencie seus dados.",
      },
    ],
  }),
  component: MinhaContaPage,
});

const signupSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome completo").max(100),
    email: z.string().trim().email("E-mail inválido").max(255),
    password: z.string().min(6, "Mínimo 6 caracteres").max(72),
    confirm: z.string().min(1, "Repita a senha"),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "As senhas não coincidem",
  });

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

function MinhaContaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-8 animate-spin text-gold" />
          </div>
        ) : user ? (
          <Dashboard user={user} />
        ) : (
          <AuthForms />
        )}
      </div>
      <Footer />
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className="pr-10"
      />
      <button
        type="button"
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function AuthForms() {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Área Exclusiva</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Minha Conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesse para acompanhar seus pedidos.</p>
      </div>

      <Card className="border-border bg-card p-6">
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger value="login" className="uppercase tracking-widest text-xs">
              Entrar
            </TabsTrigger>
            <TabsTrigger value="signup" className="uppercase tracking-widest text-xs">
              Cadastrar
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-6">
            <LoginForm />
          </TabsContent>
          <TabsContent value="signup" className="mt-6">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com nossa política de privacidade.
      </p>
    </div>
  );
}

function LoginForm() {
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNeedsConfirmation(false);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        const code = ((error as any).code ?? "").toLowerCase();
        const m = error.message.toLowerCase();
        if (code === "email_not_confirmed" || m.includes("not confirmed") || m.includes("email not confirmed")) {
          setNeedsConfirmation(true);
          toast.error("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
          return;
        }
        const msg = /invalid|credentials/i.test(error.message)
          ? "E-mail ou senha incorretos."
          : error.message;
        toast.error(msg);
        return;
      }
      toast.success("Bem-vindo de volta!");
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email.trim()) {
      toast.error("Digite seu e-mail acima primeiro.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/minha-conta` },
      });
      if (error) toast.error("Não foi possível reenviar agora. Tente em alguns minutos.");
      else toast.success("Enviamos o link de confirmação novamente.");
    } finally {
      setResending(false);
    }
  };

  if (mode === "forgot") return <ForgotPasswordForm onBack={() => setMode("login")} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {needsConfirmation && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-2">
              <p>
                <strong>Confirme seu e-mail</strong> antes de entrar. Enviamos um link para{" "}
                <strong>{email}</strong>. Verifique também a caixa de spam.
              </p>
              <button
                type="button"
                onClick={resendConfirmation}
                disabled={resending}
                className="text-xs font-medium uppercase tracking-wider text-gold underline-offset-4 hover:underline disabled:opacity-50"
              >
                {resending ? "Reenviando..." : "Reenviar link de confirmação"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="login-pass">Senha</Label>
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-gold hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
        <PasswordInput
          id="login-pass"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-gold text-gold-foreground hover:bg-gold/90 uppercase tracking-widest"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
      </Button>
      <AppleSignInButton />
      <GoogleSignInButton />
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email("E-mail inválido").safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      await solicitarRecuperacaoSenha({ data: { email: parsed.data } });
      toast.success("Se este e-mail estiver cadastrado, enviamos um link de recuperação.");
      setSentTo(parsed.data);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-gold/10 text-gold">
          ✓
        </div>
        <h3 className="text-lg font-medium">E-mail enviado!</h3>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de recuperação para <strong className="text-foreground">{sentTo}</strong>.
          Verifique sua caixa de entrada (e a pasta de spam) para redefinir sua senha.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full uppercase tracking-widest"
        >
          Voltar para login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3" /> Voltar para login
      </button>
      <div>
        <Label htmlFor="forgot-email">E-mail cadastrado</Label>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Enviaremos um link seguro para você redefinir sua senha.
        </p>
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-gold text-gold-foreground hover:bg-gold/90 uppercase tracking-widest"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : "Enviar Link de Recuperação"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [submitting, setSubmitting] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const mapSignupError = (err: { code?: string; message?: string; status?: number }): string => {
    const code = (err.code ?? "").toLowerCase();
    const m = (err.message ?? "").toLowerCase();
    if (code === "user_already_exists" || m.includes("already registered") || m.includes("already exists") || m.includes("already")) {
      return "Este e-mail já está cadastrado. Faça login ou recupere a senha.";
    }
    if (code === "weak_password" || m.includes("weak") || m.includes("pwned") || m.includes("breach") || m.includes("leaked")) {
      return "Esta senha é muito fraca ou já apareceu em vazamentos. Use uma senha mais forte (misture letras, números e símbolos).";
    }
    if (m.includes("password") && m.includes("character")) {
      return "A senha precisa ter no mínimo 6 caracteres.";
    }
    if (code === "validation_failed" || m.includes("invalid email") || m.includes("email")) {
      return "E-mail inválido. Confira o endereço digitado.";
    }
    if (err.status === 422) {
      return "Não foi possível criar a conta. Verifique e-mail e senha (mínimo 6 caracteres, sem senhas comuns).";
    }
    return err.message || "Não foi possível concluir o cadastro. Tente novamente.";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validação no cliente — mensagens claras antes de chamar o servidor
    if (nome.trim().length < 2) {
      setErrorMsg("Informe seu nome completo.");
      toast.error("Informe seu nome completo.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("A senha precisa ter no mínimo 6 caracteres.");
      toast.error("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("As senhas não coincidem. Verifique e tente novamente.");
      toast.error("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }
    const parsed = signupSchema.safeParse({ nome, email, password, confirm });
    if (!parsed.success) {
      const msg = parsed.error.issues[0].message;
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/minha-conta`,
          data: { nome_completo: parsed.data.nome },
        },
      });
      if (error) {
        const friendly = mapSignupError(error as any);
        setErrorMsg(friendly);
        toast.error(friendly);
        return;
      }
      if (data.user) {
        const { error: insertError } = await supabase.from("clientes").upsert({
          id: data.user.id,
          nome_completo: parsed.data.nome,
          email: parsed.data.email,
        });
        if (insertError) console.error("[clientes] insert failed", insertError);
      }
      // E-mail de boas-vindas (não bloqueia o cadastro se falhar)
      supabase.functions
        .invoke("enviar-email", {
          body: {
            to: parsed.data.email,
            subject: "Bem-vindo(a) à ELITE316 — Joias em Aço 316L",
            html: htmlBoasVindas(parsed.data.nome),
          },
        })
        .catch((e) => console.error("[welcome-email]", e));

      // Com auto-confirmação habilitada, o usuário já é logado automaticamente.
      if (data.session) {
        toast.success("Cadastro concluído! Bem-vindo(a) à ELITE316.");
        window.location.reload();
        return;
      }
      // Fallback: caso a confirmação por e-mail volte a ficar obrigatória
      setSentTo(parsed.data.email);
      toast.success("Cadastro criado! Confirme seu e-mail para entrar.");
    } catch (err: any) {
      const friendly = mapSignupError(err);
      setErrorMsg(friendly);
      toast.error(friendly);
    } finally {
      setSubmitting(false);
    }
  };

  const resendConfirmation = async () => {
    if (!sentTo) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: sentTo,
        options: { emailRedirectTo: `${window.location.origin}/minha-conta` },
      });
      if (error) {
        toast.error("Não foi possível reenviar agora. Tente em alguns minutos.");
      } else {
        toast.success("Enviamos o link de confirmação novamente.");
      }
    } finally {
      setResending(false);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Mail className="size-7" />
        </div>
        <div>
          <h3 className="font-display text-xl text-foreground">Confirme seu e-mail</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos um link de confirmação para{" "}
            <strong className="text-foreground">{sentTo}</strong>.
            <br />
            Abra seu e-mail e clique no link para ativar sua conta.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Não recebeu? Verifique a caixa de spam ou promoções.
          </p>
        </div>
        <Button
          type="button"
          onClick={resendConfirmation}
          disabled={resending}
          variant="outline"
          className="w-full uppercase tracking-widest"
        >
          {resending ? <Loader2 className="size-4 animate-spin" /> : "Reenviar e-mail de confirmação"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMsg && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}
      <div>
        <Label htmlFor="su-nome">Nome completo</Label>
        <Input
          id="su-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          required
        />
      </div>
      <div>
        <Label htmlFor="su-email">E-mail</Label>
        <Input
          id="su-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <Label htmlFor="su-pass">Senha</Label>
        <PasswordInput
          id="su-pass"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={6}
        />
        <p className="mt-1 text-xs text-muted-foreground">Mínimo 6 caracteres. Evite senhas óbvias (ex: 123456).</p>
      </div>
      <div>
        <Label htmlFor="su-confirm">Repetir Senha</Label>
        <PasswordInput
          id="su-confirm"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={6}
        />
        {confirm.length > 0 && password !== confirm && (
          <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>
        )}
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-gold text-gold-foreground hover:bg-gold/90 uppercase tracking-widest"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : "Criar Conta"}
      </Button>
      <AppleSignInButton />
      <GoogleSignInButton />
    </form>
  );
}


type ClienteInfo = { nome_completo: string | null; email: string | null; telefone?: string | null };

function Dashboard({ user }: { user: User }) {
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [pedidos, setPedidos] = useState<
    Array<{
      id: string;
      numero: number;
      total: number;
      status: string;
      criado_em: string;
      itens_pedido?: Array<{
        id: string;
        nome_produto: string;
        quantidade: number;
        comprimento: string | null;
      }>;
    }>
  >([]);

  useEffect(() => {
    const carregarPedidos = async () => {
      const { data: c } = await supabase
        .from("clientes")
        .select("nome_completo, email, telefone")
        .eq("id", user.id)
        .maybeSingle();
      setCliente(c ?? null);
      const { data: p, error } = await (supabase as any)
        .from("pedidos")
        .select(
          "id, numero, total, status, criado_em, itens_pedido(id,nome_produto,quantidade,comprimento)",
        )
        .eq("cliente_id", user.id)
        .eq("carrinho_abandonado", false)
        .order("criado_em", { ascending: false });
      if (error) {
        toast.error("Não foi possível carregar seus pedidos.");
        return;
      }
      setPedidos((p ?? []).map((x: any) => ({ ...x, total: Number(x.total) })));
    };
    carregarPedidos();
    const channel = supabase
      .channel(`minha-conta-pedidos-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `cliente_id=eq.${user.id}` },
        carregarPedidos,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta.");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Minha Conta</p>
          <h1 className="mt-2 font-display text-4xl text-foreground">
            Olá,{" "}
            <span className="text-gold">{cliente?.nome_completo?.split(" ")[0] ?? "Cliente"}</span>
          </h1>
        </div>
        <Button variant="outline" onClick={logout} className="border-platinum/30">
          <LogOut className="mr-2 size-4" /> Sair
        </Button>
      </div>

      <EditarPerfilCard user={user} cliente={cliente} onSaved={(c: ClienteInfo) => setCliente((p) => ({ ...(p ?? { nome_completo: null, email: null }), ...c }))} />
      {user.email === "elite316@outlook.com.br" && (
        <Card className="mb-8 border-border bg-card p-6">
          <Link to="/admin">
            <Button className="w-full gap-2 bg-gold text-gold-foreground hover:bg-gold/90 uppercase tracking-widest">
              <Crown className="size-4" /> Painel Admin
            </Button>
          </Link>
        </Card>
      )}

      <Card className="border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Package className="size-5 text-gold" />
          <h2 className="font-display text-lg">Meus pedidos</h2>
        </div>
        {pedidos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Você ainda não tem pedidos.{" "}
            <Link to="/" className="text-gold underline">
              Explorar coleção
            </Link>
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {pedidos.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">Pedido #{p.numero}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {(p.itens_pedido ?? []).length > 0
                      ? (p.itens_pedido ?? [])
                          .map(
                            (item) =>
                              `${item.quantidade}× ${item.nome_produto}${item.comprimento ? ` · ${item.comprimento}` : ""}`,
                          )
                          .join(" • ")
                      : "Itens em processamento"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gold">{brl(p.total)}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {p.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function EditarPerfilCard({
  user,
  cliente,
  onSaved,
}: {
  user: User;
  cliente: ClienteInfo | null;
  onSaved: (c: ClienteInfo) => void;
}) {
  const salvar = useServerFn(atualizarPerfilCliente);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [end, setEnd] = useState({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  useEffect(() => {
    setNome(cliente?.nome_completo ?? "");
    setTelefone(cliente?.telefone ?? "");
  }, [cliente?.nome_completo, cliente?.telefone]);

  useEffect(() => {
    if (!editando) return;
    (async () => {
      const { data } = await supabase
        .from("enderecos")
        .select("cep,rua,numero,complemento,bairro,cidade,estado")
        .eq("cliente_id", user.id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setEnd({
          cep: data.cep ?? "",
          rua: data.rua ?? "",
          numero: data.numero ?? "",
          complemento: data.complemento ?? "",
          bairro: data.bairro ?? "",
          cidade: data.cidade ?? "",
          estado: data.estado ?? "",
        });
      }
    })();
  }, [editando, user.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 2) {
      toast.error("Informe seu nome completo.");
      return;
    }
    setSaving(true);
    try {
      const enderecoCompleto = end.cep && end.rua && end.numero && end.bairro && end.cidade && end.estado;
      const res = await salvar({
        data: {
          nome_completo: nome.trim(),
          telefone: telefone.trim() || null,
          endereco: enderecoCompleto
            ? {
                cep: end.cep,
                rua: end.rua,
                numero: end.numero,
                complemento: end.complemento || null,
                bairro: end.bairro,
                cidade: end.cidade,
                estado: end.estado.toUpperCase(),
              }
            : null,
        },
      });
      onSaved({ nome_completo: nome.trim(), email: cliente?.email ?? user.email ?? null, telefone });
      if (res?.alteracoes?.length) {
        toast.success("Dados atualizados! Enviamos um e-mail de segurança para você.");
      } else {
        toast.success("Nenhuma alteração detectada.");
      }
      setEditando(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível salvar suas alterações.");
    } finally {
      setSaving(false);
    }
  };

  if (!editando) {
    return (
      <Card className="mb-8 border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserIcon className="size-5 text-gold" />
            <h2 className="font-display text-lg">Dados pessoais</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditando(true)} className="border-platinum/30">
            Editar Perfil
          </Button>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Nome:</span> {cliente?.nome_completo ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">E-mail:</span> {cliente?.email ?? user.email}
          </div>
          <div>
            <span className="text-muted-foreground">Telefone:</span> {cliente?.telefone || "—"}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-8 border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <UserIcon className="size-5 text-gold" />
        <h2 className="font-display text-lg">Editar Perfil</h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="ep-nome">Nome completo</Label>
            <Input id="ep-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ep-tel">Telefone</Label>
            <Input id="ep-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-0000" />
          </div>
        </div>

        <div className="mt-2 border-t border-border pt-4">
          <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">Endereço de entrega</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="ep-cep">CEP</Label>
              <Input id="ep-cep" value={end.cep} onChange={(e) => setEnd({ ...end, cep: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ep-rua">Rua</Label>
              <Input id="ep-rua" value={end.rua} onChange={(e) => setEnd({ ...end, rua: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ep-num">Número</Label>
              <Input id="ep-num" value={end.numero} onChange={(e) => setEnd({ ...end, numero: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ep-comp">Complemento</Label>
              <Input id="ep-comp" value={end.complemento} onChange={(e) => setEnd({ ...end, complemento: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ep-bairro">Bairro</Label>
              <Input id="ep-bairro" value={end.bairro} onChange={(e) => setEnd({ ...end, bairro: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ep-cidade">Cidade</Label>
              <Input id="ep-cidade" value={end.cidade} onChange={(e) => setEnd({ ...end, cidade: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ep-uf">UF</Label>
              <Input id="ep-uf" value={end.estado} onChange={(e) => setEnd({ ...end, estado: e.target.value })} maxLength={2} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} className="bg-gold text-gold-foreground hover:bg-gold/90 uppercase tracking-widest">
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Salvar Alterações"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditando(false)} className="border-platinum/30">
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

