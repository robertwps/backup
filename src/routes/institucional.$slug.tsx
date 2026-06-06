import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Mail, MessageCircle, Clock, MapPin } from "lucide-react";

type Pagina = {
  slug: string;
  eyebrow: string;
  titulo: string;
  subtitulo: string;
  paragrafos: string[];
  extra?: React.ReactNode;
};

const PAGINAS: Record<string, Pagina> = {
  "sobre-a-marca": {
    slug: "sobre-a-marca",
    eyebrow: "Institucional",
    titulo: "Sobre a Marca",
    subtitulo: "ELITE 316 — Forjado para quem não recua.",
    paragrafos: [
      "Nascemos com o propósito de entregar o ápice em acessórios masculinos industriais de luxo. Nossas peças são usinadas exclusivamente em legítimo Aço Inoxidável 316L Cirúrgico, o material mais resistente do mercado mundial.",
      "Mais do que correntes e pingentes, forjamos símbolos de imponência, durabilidade e atitude. Nossas peças são 100% hipoalergênicas, não sofrem oxidação, não escurecem e são feitas para acompanhar a rotina do homem moderno em qualquer cenário — do treino intenso ao mar.",
      "Conheça a nossa linha e descubra o caimento perfeito.",
    ],
  },
  "politica-de-troca": {
    slug: "politica-de-troca",
    eyebrow: "Suporte",
    titulo: "Política de Troca",
    subtitulo: "Sua Satisfação Blindada — Trocas e Devoluções.",
    paragrafos: [
      "Na ELITE 316, o cliente tem total segurança. Caso o comprimento da sua corrente (50cm a 80cm) não fique com o caimento que você desejava, a sua primeira troca é 100% gratuita por nossa conta dentro do prazo de até 7 dias corridos após o recebimento do produto.",
      "Como solicitar: Envie uma mensagem para o nosso suporte informando o número do seu pedido. O produto deve ser devolvido na embalagem original e sem marcas de uso. Após recebermos a peça em nossa central, liberamos o seu crédito imediatamente para a escolha do novo tamanho.",
    ],
  },
  "politica-de-privacidade": {
    slug: "politica-de-privacidade",
    eyebrow: "Privacidade",
    titulo: "Política de Privacidade",
    subtitulo: "Segurança de Dados e Transparência.",
    paragrafos: [
      "A ELITE 316 tem o compromisso de proteger a sua privacidade. Todos os dados coletados durante o cadastro e finalização de compra (como Nome, E-mail, Telefone e Endereço consultado via ViaCEP) são criptografados de forma segura e utilizados única e exclusivamente para o processamento e envio dos seus pedidos.",
      "Nós nunca compartilhamos ou vendemos suas informações com terceiros. Suas transações via PIX ou Cartão de Crédito são processadas de forma criptografada pelos maiores gateways de pagamento certificados do mercado.",
    ],
  },
  contato: {
    slug: "contato",
    eyebrow: "Atendimento",
    titulo: "Contato",
    subtitulo: "Central de Atendimento ao Cliente.",
    paragrafos: [
      "Precisa de ajuda com o seu pedido, rastreamento ou dúvidas sobre tamanhos? Nossa equipe está pronta para te atender de forma rápida e direta.",
    ],
    extra: (
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href="mailto:suporte@elite316.com.br" className="group flex items-start gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-gold">
          <Mail className="mt-0.5 size-5 text-gold" />
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">E-mail Oficial</div>
            <div className="text-sm text-foreground group-hover:text-gold">suporte@elite316.com.br</div>
          </div>
        </a>
        <a href="https://wa.me/5577999999999" target="_blank" rel="noreferrer" className="group flex items-start gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-gold">
          <MessageCircle className="mt-0.5 size-5 text-gold" />
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp</div>
            <div className="text-sm text-foreground group-hover:text-gold">(77) 99999-9999</div>
          </div>
        </a>
        <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
          <Clock className="mt-0.5 size-5 text-gold" />
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Horário</div>
            <div className="text-sm">Segunda a Sexta, das 09h às 18h.</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
          <MapPin className="mt-0.5 size-5 text-gold" />
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Central de Distribuição</div>
            <div className="text-sm">Enviado diretamente de Vitória da Conquista - BA.</div>
          </div>
        </div>
      </div>
    ),
  },
};

export const Route = createFileRoute("/institucional/$slug")({
  loader: ({ params }) => {
    const pagina = PAGINAS[params.slug];
    if (!pagina) throw notFound();
    return { pagina };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.pagina;
    return {
      meta: [
        { title: `${p?.titulo ?? "Institucional"} — ELITE316` },
        { name: "description", content: p?.subtitulo ?? "Página institucional ELITE316." },
        { property: "og:title", content: `${p?.titulo ?? "Institucional"} — ELITE316` },
        { property: "og:description", content: p?.subtitulo ?? "" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Página não encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-gold underline">Voltar para a loja</Link>
      </div>
      <Footer />
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl">Erro ao carregar a página</h1>
      </div>
      <Footer />
    </div>
  ),
  component: InstitucionalPage,
});

function InstitucionalPage() {
  const { pagina } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-gold">
            <ChevronLeft className="size-3" /> Voltar
          </Link>
          <div className="mt-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{pagina.eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl text-foreground">{pagina.titulo}</h1>
            <p className="mt-4 text-base text-platinum/80 italic">{pagina.subtitulo}</p>
          </div>
          <Card className="mt-10 border-border bg-card p-8 md:p-10">
            <div className="space-y-5 text-[15px] leading-relaxed text-muted-foreground">
              {pagina.paragrafos.map((p: string, i: number) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {pagina.extra}
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
