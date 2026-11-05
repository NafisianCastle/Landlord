import { createClient } from "@/lib/supabase/server";
import { LIFETIME_PRICE_BDT } from "@/lib/sslcommerz";

export interface AppSettings {
  lifetimePriceBdt: number;
  trialDays: number;
}

const DEFAULTS: AppSettings = { lifetimePriceBdt: LIFETIME_PRICE_BDT, trialDays: 14 };

// app_settings has an open select policy (readable pre-login for the pricing
// section on the landing page), so this needs no service-role client.
export async function getAppSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("lifetime_price_bdt, trial_days")
    .eq("id", 1)
    .maybeSingle();

  if (!data) return DEFAULTS;
  return { lifetimePriceBdt: data.lifetime_price_bdt, trialDays: data.trial_days };
}
