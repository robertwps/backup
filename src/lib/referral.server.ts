import { brl } from "@/lib/format";

export const REFERRAL_BONUS_DEFAULT = 20;

export async function getReferralBonusAmount(supabase: any) {
  const { data, error } = await supabase
    .from("referral_settings")
    .select("bonus_amount")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Number(data?.bonus_amount ?? REFERRAL_BONUS_DEFAULT);
}

export async function applyReferralReward(
  supabase: any,
  referrerId: string,
  pedidoId: string,
  pedidoNumero: number | null,
) {
  const bonusAmount = await getReferralBonusAmount(supabase);
  const { data: referrer } = await supabase
    .from("clientes")
    .select("referral_balance")
    .eq("id", referrerId)
    .maybeSingle();

  const currentBalance = Number(referrer?.referral_balance ?? 0);
  const nextBalance = currentBalance + bonusAmount;

  await supabase.from("clientes").update({ referral_balance: nextBalance }).eq("id", referrerId);

  await supabase.from("notifications").insert({
    title: "Crédito de indicação liberado",
    message: `Você ganhou ${brl(bonusAmount)} em crédito porque um amigo concluiu o pedido #${String(pedidoNumero ?? "—").padStart(5, "0")}.`, 
    user_id: referrerId,
    product_id: null,
    is_read: false,
  });

  await supabase.from("pedidos").update({ referral_credit_applied: true }).eq("id", pedidoId);
}
