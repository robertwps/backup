import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
const CHECKOUT_STORAGE_KEY = "elite316-checkout-contact-address";
const EXIT_INTENT_KEY = "elite316_exit_intent_shown";

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

  const [frete, setFrete] = useState(0);
  const [freteTipo, setFreteTipo] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [openPay, setOpenPay] = useState(false);
  const [status, setStatus] = useState<"idle" | "pendente">("idle");
  const [loading, setLoading] = useState(false);
  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ codigo: string; tipo: string; valor: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplied, setCouponApplied] = useState(false);
  const [referralBalance, setReferralBalance] = useState(0);
  const [useReferralBalance, setUseReferralBalance] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const couponDiscount = useMemo(() => {
    if (!couponInfo) return 0;
    if (couponInfo.tipo === "percentual") {
      return Math.min((subtotal * couponInfo.valor) / 100, subtotal);
    }
    return Math.min(couponInfo.valor, subtotal);
  }, [couponInfo, subtotal]);
  const referralDiscount = useMemo(() => {
    if (!useReferralBalance || referralBalance <= 0) return 0;
    return Math.min(referralBalance, Math.max(subtotal - couponDiscount, 0));
  }, [couponDiscount, referralBalance, subtotal, useReferralBalance]);
  const total = useMemo(() => Math.max(subtotal + frete - couponDiscount - referralDiscount, 0), [couponDiscount, frete, referralDiscount, subtotal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved) as Partial<{
        nome: string;
        email: string;
        cpf: string;
        telefone: string;
        cep: string;
        rua: string;
        numero: string;
        complemento: string;
        bairro: string;
        cidade: string;
        estado: string;
      }>;
      if (data.nome) setNome(data.nome);
      if (data.email) setEmail(data.email);
      if (data.cpf) setCpf(data.cpf);
      if (data.telefone) setTelefone(data.telefone);
      if (data.cep) setCep(data.cep);
      if (data.rua) setRua(data.rua);
      if (data.numero) setNumero(data.numero);
      if (data.complemento) setComplemento(data.complemento);
      if (data.bairro) setBairro(data.bairro);
      if (data.cidade) setCidade(data.cidade);
      if (data.estado) setEstado(data.estado);
    } catch (error) {
      console.warn("[checkout] não foi possível carregar dados salvos", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedCode = window.localStorage.getItem("elite316_referral_code");
    if (storedCode) {
      setReferralCode(storedCode.toUpperCase());
    }

    let mounted = true;
    void (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user || !mounted) return;

        const [{ data: clientRow }, { data: referrerRow }] = await Promise.all([
          supabase
            .from("clientes")
            .select("referral_balance, referral_code")
            .eq("id", user.id)
            .maybeSingle(),
          storedCode
            ? supabase
                .from("clientes")
                .select("id")
                .eq("referral_code", storedCode.toUpperCase())
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (!mounted) return;
        if (clientRow) {
          setReferralBalance(Number(clientRow.referral_balance ?? 0));
          if (!clientRow.referral_code) {
            const generated = user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
            await supabase.from("clientes").update({ referral_code: generated }).eq("id", user.id);
            setReferralCode(generated);
          } else {
            setReferralCode(clientRow.referral_code);
          }
        }

        if (referrerRow?.id && referrerRow.id !== user.id) {
          setReferralId(referrerRow.id);
        }
      } catch (error) {
        console.warn("[checkout] erro ao carregar dados de indicação", error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (showExitModal) return;
    const today = new Date().toISOString().slice(0, 10);
    const alreadyShown = typeof window !== "undefined" && window.localStorage.getItem(EXIT_INTENT_KEY) === today;
    if (alreadyShown) return;

    const handleMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 20 && !showExitModal && items.length > 0) {
        setShowExitModal(true);
        window.localStorage.setItem(EXIT_INTENT_KEY, today);
      }
    };

    window.addEventListener("mouseout", handleMouseLeave);
    return () => {
      window.removeEventListener("mouseout", handleMouseLeave);
    };
  }, [items.length, showExitModal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        nome,
        email,
        cpf,
        telefone,
        cep,
        rua,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
      };
      window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("[checkout] não foi possível salvar dados", error);
    }
  }, [nome, email, cpf, telefone, cep, rua, numero, complemento, bairro, cidade, estado]);

  const limparDadosLocalStorage = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
  };

  const aplicarCupom = async (codigo?: string) => {
    const codeToCheck = (codigo ?? couponCode).trim().toUpperCase();
    console.log("[checkout] aplicando cupom:", { codeToCheck, received: codigo });
    
    if (!codeToCheck) {
      console.log("[checkout] cupom vazio, exibindo erro");
      setCouponError("Digite um cupom para aplicar.");
      setCouponApplied(false);
      return;
    }
    
    setCouponCode(codeToCheck);
    setCouponError(null);
    try {
      console.log("[checkout] consultando cupom na base de dados");
      const { data, error } = await supabase
        .from("cupons")
        .select("codigo, tipo, valor")
        .eq("codigo", codeToCheck)
        .eq("ativa", true)
        .maybeSingle();
      if (error) throw error;
      
      if (!data) {
        console.log("[checkout] cupom não encontrado:", codeToCheck);
        setCouponError("Cupom não encontrado ou inativo.");
        setCouponApplied(false);
        setCouponInfo(null);
        return;
      }
      
      console.log("[checkout] cupom válido:", data);
      setCouponInfo({ codigo: data.codigo, tipo: data.tipo, valor: Number(data.valor) });
      setCouponApplied(true);
      toast.success(`Cupom ${data.codigo} aplicado.`);
    } catch (error) {
      console.error("[checkout] erro ao validar cupom", error);
      setCouponError(
        error instanceof Error ? error.message : "Não foi possível validar o cupom."
      );
      setCouponApplied(false);
      setCouponInfo(null);
    }
  };

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

  function validarCamposObrigatorios() {
    const missing: string[] = [];
    if (!nome.trim()) missing.push("Nome completo");
    if (!email.trim()) missing.push("E-mail");
    if (!cpf.trim()) missing.push("CPF");
    if (!telefone.trim()) missing.push("WhatsApp");
    if (!cep.trim()) missing.push("CEP");
    if (!rua.trim()) missing.push("Rua");
    if (!numero.trim()) missing.push("Número");
    if (!bairro.trim()) missing.push("Bairro");
    if (!cidade.trim()) missing.push("Cidade");
    if (!estado.trim()) missing.push("UF");
    return missing;
  }

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
    console.log("[checkout] abrirPagamento iniciado", {
      subtotal,
      frete,
      freteTipo,
      total,
      loading,
    });

    if (subtotal <= 0) {
      console.warn("[checkout] subtotal inválido:", subtotal);
      toast.error("Carrinho vazio. Adicione itens antes de finalizar.");
      return;
    }

    const missing = validarCamposObrigatorios();
    if (missing.length > 0) {
      console.warn("[checkout] campos obrigatórios faltando:", missing);
      setMissingFields(missing);
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    if (!freteTipo) {
      console.warn("[checkout] frete não selecionado");
      toast.error("Selecione o frete antes de finalizar o pedido.");
      return;
    }

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
      const missing = validarCamposObrigatorios();
      if (missing.length > 0) {
        setMissingFields(missing);
      }
      toast.error("Por favor, preencha todos os seus dados de envio e contato!");
      return;
    }

    setMissingFields([]);
    setLoading(true);
    setPixConfirmado(false);
    console.log("[checkout] enviando cobrança PIX com dados:", {
      nome: nomeFinal,
      email: emailFinal,
      valor: Number(total.toFixed(2)),
      frete,
      freteTipo,
    });
    try {
      const result = await gerarCobranca({
        data: {
          nome: nomeFinal,
          email: emailFinal,
          cpfCnpj: cpfDigits,
          telefone: telDigits,
          valor: Number(total.toFixed(2)),
          subtotal: Number(subtotal.toFixed(2)),
          desconto: Number((couponDiscount + referralDiscount).toFixed(2)),
          cupomCodigo: couponInfo?.codigo ?? null,
          referidoPor: referralId,
          referralAmountUsed: referralDiscount,
          frete: Number(frete.toFixed(2)),
          freteTipo,
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
      console.log("[checkout] cobrança gerada com sucesso:", result);
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
      limparDadosLocalStorage();
      cart.clear();
      setOpenPay(false);
      navigate({ to: "/pedido-sucesso" });
    }, 2000);
    return () => clearTimeout(t);
  }, [pixConfirmado, navigate]);

  async function pagarComCartao() {
    if (cardLoading) return;
    setCardError(null);

    if (!freteTipo) {
      setCardError("Selecione o frete antes de finalizar o pedido.");
      return;
    }

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
      const missing = validarCamposObrigatorios();
      if (missing.length > 0) {
        setMissingFields(missing);
      }
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
    console.log("[checkout] iniciando pagamento por cartão com dados:", {
      nome: nomeFinal,
      email: emailFinal,
      valor: Number(total.toFixed(2)),
      frete,
      freteTipo,
      cardNumber: `****${cardNumber.slice(-4)}`,
    });
    try {
      await pagarCartao({
        data: {
          nome: nomeFinal,
          email: emailFinal,
          cpfCnpj: cpfDigits,
          telefone: telDigits,
          valor: Number(total.toFixed(2)),
          subtotal: Number(subtotal.toFixed(2)),
          desconto: Number((couponDiscount + referralDiscount).toFixed(2)),
          cupomCodigo: couponInfo?.codigo ?? null,
          referidoPor: referralId,
          referralAmountUsed: referralDiscount,
          frete: Number(frete.toFixed(2)),
          freteTipo,
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
      console.log("[checkout] pagamento por cartão aprovado");
      toast.success("Pagamento aprovado!");
      limparDadosLocalStorage();
      cart.clear();
      navigate({ to: "/pedido-sucesso" });
    } catch (err) {
      console.error("[checkout] erro ao pagar com cartão", err);
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
                <FreteSimulador
                  selectedFrete={freteTipo}
                  onSelectFrete={(opcao) => {
                    setFrete(opcao.valor);
                    setFreteTipo(opcao.nome);
                  }}
                />
              </div>
              {freteTipo && (
                <p className="mt-3 text-sm text-emerald-300">
                  Frete selecionado: <strong>{freteTipo}</strong> — {brl(frete)}
                </p>
              )}
              <p className="mt-3 text-[11px] italic text-muted-foreground">
                Enviado de {ORIGEM_LABEL}.
              </p>

              <div className="mt-6 rounded-lg border border-border bg-card p-4">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Cupom de desconto (opcional)</Label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                      setCouponApplied(false);
                    }}
                    placeholder="Ex: VOLTA10"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => aplicarCupom()}
                    variant="outline"
                    className="border-gold/40 text-gold hover:bg-gold/5 hover:border-gold/60 sm:w-auto"
                  >
                    Aplicar
                  </Button>
                </div>
                {couponError && !couponApplied && (
                  <p className="mt-2 text-sm text-red-400/70">{couponError}</p>
                )}
                {couponInfo && couponApplied && (
                  <p className="mt-2 text-sm text-emerald-300">
                    ✓ Cupom {couponInfo.codigo} aplicado — {couponInfo.tipo === "percentual" ? `${couponInfo.valor}%` : brl(couponInfo.valor)} de desconto.
                  </p>
                )}
              </div>

              {referralCode && (
                <div className="mt-4 rounded-lg border border-border bg-card/50 p-3 text-xs text-muted-foreground">
                  Seu código de indicação: <strong className="text-gold">{referralCode}</strong>
                </div>
              )}

                  {referralBalance > 0 && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-emerald-100">
                        <Checkbox
                          checked={useReferralBalance}
                          onCheckedChange={(checked) => setUseReferralBalance(checked === true)}
                        />
                        Usar crédito de indicação de {brl(referralBalance)} nesta compra
                      </label>
                      {useReferralBalance && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {brl(referralDiscount)} aplicado como saldo de indicação.
                        </p>
                      )}
                    </div>
                  )}

                  {referralId && (
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-sky-100">
                      Código de indicação reconhecido: seu pedido será vinculado ao indicador.
                    </div>
                  )}

              {missingFields.length > 0 && (
                <div className="mt-6 rounded-3xl border border-[#cca056] bg-slate-950/95 p-4 text-white shadow-lg shadow-black/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#cca056]">Campos obrigatórios</p>
                      <p className="mt-2 text-sm font-semibold">Preencha os campos abaixo antes de pagar:</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[#cca056] text-[#cca056] hover:bg-[#cca056]/10"
                      onClick={() => setMissingFields([])}
                    >
                      Entendi
                    </Button>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-slate-100">
                    {missingFields.map((field) => (
                      <li key={field} className="flex items-center gap-2">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#cca056]" />
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-6 space-y-3 rounded-lg border border-border bg-card/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{brl(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-300">
                    <span>Desconto do cupom</span>
                    <span>-{brl(couponDiscount)}</span>
                  </div>
                )}
                {referralDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-300">
                    <span>Uso de saldo de indicação</span>
                    <span>-{brl(referralDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{brl(frete)}</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between font-display text-lg">
                  <span>Total</span>
                  <span className="text-gold">{brl(total)}</span>
                </div>
              </div>
              <Button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  console.log("[checkout] botão PAGAR AGORA clicado");
                  abrirPagamento();
                }}
                disabled={loading || items.length === 0}
                className="mt-6 w-full bg-gold text-gold-foreground uppercase tracking-widest font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Processando pagamento…
                  </>
                ) : (
                  "Pagar Agora"
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
              Total a pagar: <span className="font-semibold text-gold">{brl(total)}</span>
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

      <Dialog open={showExitModal} onOpenChange={(open) => { if (!open) setShowExitModal(false); }}>
        <DialogContent className="max-w-xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>Espere! Antes de sair...</DialogTitle>
            <DialogDescription>
              Ganhe 10% OFF agora com o cupom <strong>VOLTA10</strong> e finalize seu pedido com mais economia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Vimos que você está quase saindo da página. Aproveite um incentivo especial e não perca seu carrinho.
            </p>
            <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
              <p className="text-sm font-semibold text-foreground">Código recomendado</p>
              <p className="mt-1 text-lg font-bold tracking-widest text-gold">VOLTA10</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cupom válido se estiver cadastrado em <strong>Cupons</strong> e ativo na loja.
              </p>
            </div>
            {couponError && (
              <p className="text-sm text-red-400">{couponError}</p>
            )}
            {couponInfo && couponApplied && (
              <p className="text-sm text-emerald-300">
                {couponInfo.codigo} aplicado — você economiza {brl(couponDiscount)}.
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              className="bg-gold text-gold-foreground hover:bg-gold/90"
              onClick={() => {
                void aplicarCupom("VOLTA10");
              }}
            >
              Aplicar VOLTA10
            </Button>
            <Button variant="outline" onClick={() => setShowExitModal(false)}>
              Continuar sem cupom
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
