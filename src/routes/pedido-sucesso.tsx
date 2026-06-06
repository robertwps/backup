import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

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
        </Card>
      </div>
      <Footer />
    </div>
  );
}
