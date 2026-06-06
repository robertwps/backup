import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  LogOut,
  Tag,
  Package,
  Users,
  ShoppingBag,
  Ticket,
  LayoutDashboard,
  Settings,
  Search,
  ChevronDown,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationsBell } from "@/components/admin/NotificationsBell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — ELITE316" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  // `loading = true` enquanto aguardamos a primeira resposta de auth (evita
  // piscada do formulário de login e o loop de redirecionamento no F5).
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();

  const ADMIN_BYPASS_EMAIL = "elite316@outlook.com.br";

  useEffect(() => {
    let mounted = true;

    const evaluateSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!mounted) return;
      if (!session) {
        setUserEmail(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setUserEmail(session.user.email ?? null);
      if (session.user.email?.toLowerCase() === ADMIN_BYPASS_EMAIL) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }
      try {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        if (!mounted) return;
        setIsAdmin(!!roles?.some((r) => r.role === "admin"));
      } catch (err) {
        console.error("[admin] roles check error", err);
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // 1) Listener PRIMEIRO — onAuthStateChange dispara INITIAL_SESSION assim
    //    que o cliente hidrata a sessão do storage, mantendo o usuário
    //    autenticado após F5 sem cair no loop de login.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void evaluateSession(session);
    });

    // 2) Em seguida pedimos a sessão atual para resolver o estado mesmo se o
    //    listener ainda não tiver emitido o evento inicial.
    supabase.auth
      .getSession()
      .then(({ data }) => evaluateSession(data.session))
      .catch((err) => {
        console.error("[admin] getSession error", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
      </div>
    );
  }
  if (!isAdmin) return <AdminLogin />;

  const nav: Array<{ to: any; label: string; icon: any; exact?: boolean }> = [
    { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
    { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
    { to: "/admin/recuperacao", label: "Recuperação", icon: MessageCircle },
    { to: "/admin/produtos", label: "Produtos", icon: Package },
    { to: "/admin/clientes", label: "Clientes", icon: Users },
    { to: "/admin/categorias", label: "Categorias", icon: Tag },
    { to: "/admin/cupons", label: "Cupons", icon: Ticket },
    { to: "/admin/combo", label: "Combine e Ganhe", icon: Sparkles },
  ];

  const initial = (userEmail ?? "A").charAt(0).toUpperCase();
  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada.");
    router.navigate({ to: "/minha-conta", replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <Link
          to="/"
          className="flex h-16 items-center gap-2 border-b border-slate-800 px-6 transition hover:bg-slate-800/50"
        >
          <div className="flex size-8 items-center justify-center rounded-md bg-indigo-500 font-bold text-white">
            E
          </div>
          <div>
            <p className="font-display text-sm tracking-widest text-indigo-300">ELITE316</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Admin</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: !!n.exact }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-white"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
              }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
          <div className="my-4 border-t border-slate-800" />
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/70 hover:text-white"
          >
            <Settings className="size-4" /> Configurações
          </Link>
        </nav>
        <div className="border-t border-slate-800 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-white"
            onClick={logout}
          >
            <LogOut className="mr-2 size-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur-xl md:px-8">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Buscar pedidos, produtos, clientes..."
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <NotificationsBell />
            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-1.5 pl-1.5 pr-3 hover:bg-slate-800"
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-indigo-500 text-xs font-semibold text-white">
                  {initial}
                </span>
                <span className="hidden text-xs text-slate-300 sm:inline">{userEmail}</span>
                <ChevronDown className="size-3 text-slate-500" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-800 bg-slate-900 p-1 shadow-xl">
                  <div className="border-b border-slate-800 px-3 py-2">
                    <p className="text-xs text-slate-500">Conectado como</p>
                    <p className="truncate text-sm text-slate-200">{userEmail}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
                  >
                    <LogOut className="size-4" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const router = useRouter();

  const ADMIN_BYPASS_EMAIL = "elite316@outlook.com.br";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data.user) {
        setLoginError("E-mail ou senha incorretos");
        setSubmitting(false);
        return;
      }
      if (data.user.email?.toLowerCase() !== ADMIN_BYPASS_EMAIL) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        if (!roles?.some((r) => r.role === "admin")) {
          await supabase.auth.signOut();
          setLoginError("Sua conta não tem acesso administrativo.");
          setSubmitting(false);
          return;
        }
      }

      toast.success("Bem-vindo, administrador.");
      // Sai do estado de "submitting" antes de navegar para não travar a tela
      // se o usuário retornar para /admin.
      setSubmitting(false);
      onSuccess?.();
      await router.navigate({ to: "/admin", replace: true });
    } catch (err: any) {
      setLoginError(err?.message ?? "Falha de conexão. Tente novamente.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 p-8 text-slate-100">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">Restrito</p>
          <h1 className="mt-2 font-display text-3xl">Painel Administrativo</h1>
          <p className="mt-2 text-sm text-slate-400">Acesso somente para administradores.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="ae" className="text-slate-300">
              E-mail
            </Label>
            <Input
              id="ae"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>
          <div>
            <Label htmlFor="ap" className="text-slate-300">
              Senha
            </Label>
            <Input
              id="ap"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-slate-100"
            />
          </div>
          {loginError ? (
            <p className="text-sm font-medium text-rose-300">{loginError}</p>
          ) : null}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-500 text-white hover:bg-indigo-400 uppercase tracking-widest"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
