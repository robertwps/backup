import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/pedido-sucesso")({
  head: () => ({
    meta: [
      { title: "Pedido realizado — ELITE316" },
      { name: "description", content: "Seu pedido foi recebido com sucesso." },
    ],
  }),
  component: SucessoPage,
});

function SucessoPage() {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [referralBalance, setReferralBalance] = useState(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        const user = sessionData.user;
        if (!user || !mounted) return;

        const { data: cliente } = await supabase
          .from("clientes")
          .select("referral_code, referral_balance")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;
        let code = cliente?.referral_code ?? null;
        if (!code) {
          code = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
          await supabase.from("clientes").update({ referral_code: code }).eq("id", user.id);
        }

        setReferralCode(code);
        setReferralBalance(Number(cliente?.referral_balance ?? 0));
        if (code && typeof window !== "undefined") {
          setShareLink(`${window.location.origin}/?ref=${code}`);
        }
      } catch (error) {
        console.warn("[pedido-sucesso] erro ao carregar dados de indicação", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const shareText = shareLink
    ? encodeURIComponent(
        `Compre na ELITE316 com meu link e ganhe R$20 de crédito na sua primeira compra: ${shareLink}`,
      )
    : "";

  const whatsappUrl = shareLink
    ? `https://api.whatsapp.com/send?text=${shareText}`
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-20">
        <Card className="border-border bg-card p-10 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/30">
            <CheckCircle2 className="size-10 text-green-500" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-gold">Confirmação</p>
          <h1 className="mt-2 font-display text-3xl text-foreground">
            Pedido realizado com sucesso!
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Aguardando aprovação do pagamento. Assim que confirmarmos o PIX,
            seu pedido entrará em produção e enviaremos o código de rastreio
            por e-mail.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to="/minha-conta">Acompanhar meus pedidos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Continuar comprando</Link>
            </Button>
          </div>

          {(shareLink || referralBalance > 0) && (
            <div className="mt-8 rounded-3xl border border-border bg-slate-950/80 p-6 text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-gold">Indicação</p>
              {shareLink ? (
                <>
                  <h2 className="mt-3 font-display text-2xl text-foreground">Compartilhe seu link e ganhe crédito</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sempre que um amigo comprar com seu link, você recebe R$20 de crédito para a próxima oferta.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="rounded-2xl border border-slate-800 bg-background p-4 text-sm break-words">
                      <p className="font-medium text-slate-100">Seu link exclusivo</p>
                      <p className="mt-2 text-xs text-slate-400">Compartilhe com amigos e acompanhe seu saldo.</p>
                      <p className="mt-3 font-mono text-sm text-emerald-200">{shareLink}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                          window.alert("Link copiado para a área de transferência");
                        }}
                      >
                        Copiar link
                      </Button>
                      <Button
                        asChild
                        className="bg-green-500 text-white hover:bg-green-400"
                      >
                        <a href={whatsappUrl} target="_blank" rel="noreferrer">
                          Compartilhar no WhatsApp
                        </a>
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Faça login para gerar seu link de indicação exclusivo.</p>
              )}
              {referralBalance > 0 && (
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-100">
                  <p className="text-sm">Seu saldo de indicação</p>
                  <p className="mt-1 text-2xl font-semibold">{brl(referralBalance)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Use este crédito em sua próxima compra.</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
}
