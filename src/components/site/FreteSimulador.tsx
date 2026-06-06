import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";

export const CEP_ORIGEM = "45000-795";
export const ORIGEM_LABEL = "Vitória da Conquista - BA";

type Opcao = { nome: string; prazo: string; valor: number };

function calcFrete(destino: string): Opcao[] {
  const d = destino.replace(/\D/g, "");
  const origem = parseInt(CEP_ORIGEM.replace(/\D/g, "").slice(0, 3), 10);
  const dest = parseInt(d.slice(0, 3) || "0", 10);
  const dist = Math.min(900, Math.abs(dest - origem));
  const base = 18 + dist * 0.04;
  return [
    { nome: "PAC", prazo: `${5 + Math.round(dist / 80)} dias úteis`, valor: +base.toFixed(2) },
    { nome: "SEDEX", prazo: `${2 + Math.round(dist / 150)} dias úteis`, valor: +(base * 1.8).toFixed(2) },
  ];
}

export function FreteSimulador({
  compact = false,
  selectedFrete,
  onSelectFrete,
}: {
  compact?: boolean;
  selectedFrete?: string | null;
  onSelectFrete?: (opcao: Opcao) => void;
}) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcao[] | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setLoading(true);
    setTimeout(() => {
      setOpcoes(calcFrete(clean));
      setLoading(false);
    }, 400);
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          inputMode="numeric"
          maxLength={9}
          placeholder="Digite seu CEP"
          value={cep}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 8);
            setCep(v.length > 5 ? `${v.slice(0, 5)}-${v.slice(5)}` : v);
          }}
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" className="border-gold/60 text-gold hover:bg-gold hover:text-gold-foreground">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Calcular"}
        </Button>
      </form>
      {opcoes && (
        <div className="rounded-lg border border-border bg-card/60 p-2 text-xs">
          {opcoes.map((o) => {
            const isSelected = selectedFrete === o.nome;
            return (
              <button
                key={o.nome}
                type="button"
                onClick={() => onSelectFrete?.(o)}
                className={
                  `w-full rounded-xl border px-3 py-2 text-left transition-all sm:flex sm:items-center sm:justify-between ${
                    isSelected
                      ? "border-gold bg-gold/10 text-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:border-gold/70 hover:bg-gold/5"
                  }`
                }
              >
                <span>
                  <b className="text-foreground">{o.nome}</b> <span className="text-muted-foreground">· {o.prazo}</span>
                </span>
                <span className="mt-1 font-semibold text-gold sm:mt-0">{brl(o.valor)}</span>
              </button>
            );
          })}
          <p className="mt-1 flex items-center gap-1 border-t border-border pt-1 text-[11px] italic text-muted-foreground">
            <Truck className="size-3 text-gold" /> Enviado de {ORIGEM_LABEL}
          </p>
        </div>
      )}
    </div>
  );
}
