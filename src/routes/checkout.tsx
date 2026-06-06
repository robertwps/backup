import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useCart, cart } from "@/lib/cart-store";
import { FreteSimulador, ORIGEM_LABEL } from "@/components/site/FreteSimulador";
import { brl } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Copy, CheckCircle2, CreditCard, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { criarCobrancaPix } from "@/lib/asaas.functions";
import { verificarPagamentoAsaas } from "@/lib/asaas-status.functions";
import { criarCobrancaCartao } from "@/lib/asaas-cartao.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — ELITE316" },
      { name: "description", content: "Finalize sua compra ELITE316 com segurança." },
    ],
  }),
  component: CheckoutPage,
});

type CobrancaPix = {
  paymentId: string;
  qrCodeImage: string;
  pixCopiaCola: string;
  valor: number;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function CheckoutPage() {
  const { items, subtotal } = useCart();
  const navigate = useNavigate();
  const gerarCobranca = useServerFn(criarCobrancaPix);
  const verificarPix = useServerFn(verificarPagamentoAsaas);
  const pagarCartao = useServerFn(criarCobrancaCartao);

  // Cartão
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp, setCardExp] = useState(""); // MM/AA
  const [cardCcv, setCardCcv] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [enderecoCarregado, setEnderecoCarregado] = useState(false);
  const [editandoEndereco, setEditandoEndereco] = useState(true);

  const [openPay, setOpenPay] = useState(false);
  const [status, setStatus] = useState<"idle" | "pendente">("idle");
  const [loading, setLoading] = useState(false);
  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!mounted || !user) return;

      setEmail((current) => current || user.email || "");
      const meta = (user.user_metadata ?? {}) as { nome_completo?: string };
      setNome((current) => current || meta.nome_completo || "");

      const [{ data: cliente }, { data: endereco }] = await Promise.all([
        supabase
          .from("clientes")
          .select("nome_completo, email, telefone, cpf")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("enderecos")
          .select("cep, rua, numero, complemento, bairro, cidade, estado")
          .eq("cliente_id", user.id)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      if (cliente) {
        setNome((current) => current || cliente.nome_completo || "");
        setEmail((current) => current || cliente.email || user.email || "");
        setTelefone((current) => current || cliente.telefone || "");
        setCpf((current) => current || (cliente as { cpf?: string | null }).cpf || "");
      }
      if (endereco) {
        setCep(endereco.cep ?? "");
        setRua(endereco.rua ?? "");
        setNumero(endereco.numero ?? "");
        setComplemento(endereco.complemento ?? "");
        setBairro(endereco.bairro ?? "");
        setCidade(endereco.cidade ?? "");
        setEstado((endereco.estado ?? "").toUpperCase());
        setEnderecoCarregado(true);
        setEditandoEndereco(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleCepChange(value: string) {
    const masked = onlyDigits(value).slice(0, 8);
    setCep(masked);
    if (masked.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${masked}/json/`);
      const data = await res.json();
      if (data?.erro) {
        toast.error("CEP não encontrado.");
        return;
      }
      setRua(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado((data.uf || "").toUpperCase());
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function abrirPagamento() {
    if (subtotal <= 0) return;

    let nomeFinal = nome.trim();
    let emailFinal = email.trim();
    let clienteId: string | null = null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (user) {
        clienteId = user.id;
        emailFinal = emailFinal || user.email || "";
        const meta = (user.user_metadata ?? {}) as { nome_completo?: string };
        nomeFinal = nomeFinal || meta.nome_completo || user.email?.split("@")[0] || "";
      }
    } catch (error) {
      console.error("[checkout] falha ao validar usuário", error);
    }

    if (!clienteId) {
      toast.error("Entre na sua conta antes de finalizar o pedido.");
      navigate({ to: "/minha-conta" });
      return;
    }

    const cpfDigits = onlyDigits(cpf);
    const telDigits = onlyDigits(telefone);
    const cepDigits = onlyDigits(cep);

    if (
      !nomeFinal ||
      !emailFinal ||
      cpfDigits.length < 11 ||
      telDigits.length < 10 ||
      cepDigits.length !== 8 ||
      !rua.trim() ||
      !numero.trim() ||
      !bairro.trim() ||
      !cidade.trim() ||
      estado.trim().length !== 2
    ) {
      toast.error("Por favor, preencha todos os seus dados de envio e contato!");
      return;
    }

    setLoading(true);
    setPixConfirmado(false);
    try {
      const result = await gerarCobranca({
        data: {
          nome: nomeFinal,
          email: emailFinal,
          cpfCnpj: cpfDigits,
          telefone: telDigits,
          valor: Number(subtotal.toFixed(2)),
          descricao: `Pedido ELITE316 — ${items.length} item(s)`,
          endereco: {
            cep: cepDigits,
            rua: rua.trim(),
            numero: numero.trim(),
            complemento: complemento.trim() || null,
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            estado: estado.trim().toUpperCase(),
          },
          itens: items.map((i) => ({
            produto_id: i.produto_id,
            variante_id: i.variante_id,
            nome: i.nome,
            comprimento: i.comprimento,
            preco_unit: i.preco_unit,
            quantidade: i.quantidade,
          })),
        },
      });
      setCobranca(result);
      setStatus("pendente");
      setOpenPay(true);
      toast.success("Cobrança PIX gerada!");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Não foi possível gerar a cobrança PIX.",
      );
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  }

  function copiarPix() {
    if (!cobranca) return;
    navigator.clipboard.writeText(cobranca.pixCopiaCola).then(() => {
      toast.success("Código Pix copiado!");
    });
  }

  // Polling automático do Pix a cada 5s
  const [pixConfirmado, setPixConfirmado] = useState(false);
  useEffect(() => {
    if (!openPay || !cobranca || pixConfirmado) return;
    let cancelado = false;
    const checar = async () => {
      try {
        const r = await verificarPix({ data: { paymentId: cobranca.paymentId } });
        if (!cancelado && r.aprovado) {
          setPixConfirmado(true);
        }
      } catch (e) {
        console.error("[pix polling]", e);
      }
    };
    void checar();
    const iv = setInterval(checar, 5000);
    return () => {
      cancelado = true;
      clearInterval(iv);
    };
  }, [openPay, cobranca, pixConfirmado, verificarPix]);

  // Após confirmação, fecha modal e redireciona em 2s
  useEffect(() => {
    if (!pixConfirmado) return;
    const t = setTimeout(() => {
      cart.clear();
      setOpenPay(false);
      navigate({ to: "/pedido-sucesso" });
    }, 2000);
    return () => clearTimeout(t);
  }, [pixConfirmado, navigate]);

  async function pagarComCartao() {
    if (cardLoading) return;
    setCardError(null);

    const nomeFinal = nome.trim();
    const emailFinal = email.trim();
    const cpfDigits = onlyDigits(cpf);
    const telDigits = onlyDigits(telefone);
    const cepDigits = onlyDigits(cep);

    if (
      !nomeFinal ||
      !emailFinal ||
      cpfDigits.length < 11 ||
      telDigits.length < 10 ||
      cepDigits.length !== 8 ||
      !rua.trim() ||
      !numero.trim() ||
      !bairro.trim() ||
      !cidade.trim() ||
      estado.trim().length !== 2
    ) {
      setCardError("Preencha todos os seus dados pessoais e de entrega antes de pagar.");
      return;
    }

    const numDigits = cardNumber.replace(/\D/g, "");
    const [mm, aa] = cardExp.split("/").map((s) => s.trim());
    if (numDigits.length < 13 || !cardName.trim() || !mm || !aa || cardCcv.length < 3) {
      setCardError("Verifique os dados do cartão (número, nome, validade MM/AA e CVV).");
      return;
    }

    setCardLoading(true);
    try {
      await pagarCartao({
        data: {
          nome: nomeFinal,
          email: emailFinal,
          cpfCnpj: cpfDigits,
          telefone: telDigits,
          valor: Number(subtotal.toFixed(2)),
          descricao: `Pedido ELITE316 — ${items.length} item(s)`,
          endereco: {
            cep: cepDigits,
            rua: rua.trim(),
            numero: numero.trim(),
            complemento: complemento.trim() || null,
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            estado: estado.trim().toUpperCase(),
          },
          cartao: {
            holderName: cardName.trim(),
            number: numDigits,
            expiryMonth: mm,
            expiryYear: aa,
            ccv: cardCcv.trim(),
          },
          itens: items.map((i) => ({
            produto_id: i.produto_id,
            variante_id: i.variante_id,
            nome: i.nome,
            comprimento: i.comprimento,
            preco_unit: i.preco_unit,
            quantidade: i.quantidade,
          })),
        },
      });
      toast.success("Pagamento aprovado!");
      cart.clear();
      navigate({ to: "/pedido-sucesso" });
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : "Transação recusada pela operadora. Verifique o saldo ou os dados inseridos e tente novamente.";
      setCardError(msg);
    } finally {
      setCardLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Checkout</p>
        <h1 className="mt-2 font-display text-4xl text-foreground">Finalizar Compra</h1>
        {status === "pendente" && (
          <p className="mt-2 text-xs uppercase tracking-widest text-amber-500">
            ⏳ Pedido Pendente — aguardando pagamento
          </p>
        )}

        {items.length === 0 ? (
          <Card className="mt-8 border-border bg-card p-10 text-center">
            <ShoppingBag className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            <Button asChild className="mt-4 bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to="/">Explorar Coleção</Link>
            </Button>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-[1fr_360px]">
            <Card className="border-border bg-card p-6">
              <h2 className="font-display text-lg">Resumo do pedido</h2>
              <div className="mt-4 divide-y divide-border">
                {items.map((i) => (
                  <div key={i.variante_id} className="flex justify-between py-3 text-sm">
                    <div>
                      <div className="font-medium">{i.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.comprimento} · {i.quantidade}x
                      </div>
                    </div>
                    <div className="font-semibold text-gold">
                      {brl(i.preco_unit * i.quantidade)}
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mt-8 font-display text-base">Dados de contato</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-widest">Nome completo *</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Como no documento"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest">E-mail *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest">CPF *</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    maxLength={14}
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest">WhatsApp (com DDD) *</Label>
                  <Input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(77) 99999-9999"
                    inputMode="tel"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-base">Endereço de entrega</h3>
                {enderecoCarregado && !editandoEndereco && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditandoEndereco(true)}
                  >
                    ✏️ Editar Endereço de Entrega
                  </Button>
                )}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest">CEP *</Label>
                  <div className="relative">
                    <Input
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                      disabled={!editandoEndereco}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-gold" />
                    )}
                  </div>
                </div>
                <div className="md:col-span-4">
                  <Label className="text-xs uppercase tracking-widest">Rua *</Label>
                  <Input
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    placeholder="Rua / Avenida"
                    disabled={!editandoEndereco}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest">Número *</Label>
                  <Input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="123"
                    disabled={!editandoEndereco}
                  />
                </div>
                <div className="md:col-span-4">
                  <Label className="text-xs uppercase tracking-widest">Complemento</Label>
                  <Input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, bloco, referência"
                    disabled={!editandoEndereco}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-xs uppercase tracking-widest">Bairro *</Label>
                  <Input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="Bairro"
                    disabled={!editandoEndereco}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-widest">Cidade *</Label>
                  <Input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Cidade"
                    disabled={!editandoEndereco}
                  />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs uppercase tracking-widest">UF *</Label>
                  <Input
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="BA"
                    maxLength={2}
                    disabled={!editandoEndereco}
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Os campos marcados com * são obrigatórios para gerar o PIX.
              </p>
            </Card>

            <Card className="h-fit border-border bg-card p-6">
              <h2 className="font-display text-lg">Frete</h2>
              <p className="mt-1 text-xs text-muted-foreground">Calcule o frete até você.</p>
              <div className="mt-3">
                <FreteSimulador />
              </div>
              <p className="mt-3 text-[11px] italic text-muted-foreground">
                Enviado de {ORIGEM_LABEL}.
              </p>

              <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{brl(subtotal)}</span>
                </div>
                <div className="flex justify-between font-display text-lg">
                  <span>Total</span>
                  <span className="text-gold">{brl(subtotal)}</span>
                </div>
              </div>
              <Button
                onClick={abrirPagamento}
                disabled={loading}
                className="mt-4 w-full bg-gold text-gold-foreground uppercase tracking-widest hover:bg-gold/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Gerando…
                  </>
                ) : (
                  "Pagar agora"
                )}
              </Button>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={openPay} onOpenChange={setOpenPay}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Pagamento</DialogTitle>
            <DialogDescription>
              Total a pagar: <span className="font-semibold text-gold">{brl(subtotal)}</span>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="pix" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pix">
                <QrCode className="mr-2 size-4" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="cartao">
                <CreditCard className="mr-2 size-4" />
                Cartão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pix" className="mt-4 space-y-4">
              {loading || !cobranca ? (
                <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-gold" />
                  <p className="mt-3">Gerando cobrança PIX no Asaas…</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-center">
                    <p className="text-xs uppercase tracking-widest text-gold">
                      Escaneie o QR Code
                    </p>
                    <img
                      src={cobranca.qrCodeImage}
                      alt="QR Code PIX"
                      className="mx-auto mt-3 size-56 rounded-md bg-white p-2"
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Pagamento processado por Asaas · ID {cobranca.paymentId}
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs uppercase tracking-widest">Pix Copia e Cola</Label>
                    <div className="mt-2 max-h-28 overflow-auto rounded-md border border-border bg-background p-3 text-[11px] font-mono break-all">
                      {cobranca.pixCopiaCola}
                    </div>
                    <Button onClick={copiarPix} variant="outline" className="mt-2 w-full">
                      <Copy className="mr-2 size-4" /> Copiar Código Pix
                    </Button>
                  </div>

                  {pixConfirmado ? (
                    <div className="flex flex-col items-center gap-2 rounded-md border border-green-500/40 bg-green-500/10 px-4 py-5 text-center">
                      <div className="flex size-12 items-center justify-center rounded-full bg-green-500/20 ring-2 ring-green-500/60 animate-in zoom-in duration-300">
                        <CheckCircle2 className="size-7 text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-green-300">
                        Pagamento confirmado!
                      </p>
                      <p className="text-xs text-green-200/80">
                        Redirecionando para seu pedido...
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-background/40 px-3 py-3 text-center text-xs text-muted-foreground">
                      <Loader2 className="size-4 animate-spin text-gold" />
                      <span>
                        Aguardando pagamento... A tela se fechará automaticamente assim que o Pix
                        for confirmado.
                      </span>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="cartao" className="mt-4 space-y-3">
              <div>
                <Label>Número do cartão</Label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  disabled={cardLoading}
                />
              </div>
              <div>
                <Label>Nome impresso no cartão</Label>
                <Input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Como está no cartão"
                  disabled={cardLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Validade</Label>
                  <Input
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    placeholder="MM/AA"
                    disabled={cardLoading}
                  />
                </div>
                <div>
                  <Label>CVV</Label>
                  <Input
                    value={cardCcv}
                    onChange={(e) => setCardCcv(e.target.value.replace(/\D/g, ""))}
                    placeholder="123"
                    inputMode="numeric"
                    disabled={cardLoading}
                  />
                </div>
              </div>
              <Button
                onClick={pagarComCartao}
                disabled={cardLoading}
                className="w-full bg-gold text-gold-foreground hover:bg-gold/90 disabled:opacity-70"
              >
                {cardLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Processando pagamento...
                  </>
                ) : (
                  <>Finalizar Compra</>
                )}
              </Button>
              {cardError && (
                <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
                  {cardError}
                </p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
