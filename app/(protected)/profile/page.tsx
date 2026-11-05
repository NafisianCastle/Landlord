import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileForm from "@/components/profile/ProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import EncryptionSettings from "@/components/profile/EncryptionSettings";
import RentReminderSettings from "@/components/profile/RentReminderSettings";
import ReferralSettings from "@/components/profile/ReferralSettings";
import YourDataSettings from "@/components/profile/YourDataSettings";
import { needsPassword } from "@/lib/account";
import { getRentReminderPublicKey } from "@/lib/pushConfig";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: referralCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "encryption_enabled, dek_salt, dek_wrapped_by_passphrase, dek_wrapped_by_passphrase_iv, referral_code, is_demo",
      )
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_referral_count"),
  ]);

  const t = await getTranslations("ProfilePage");
  const tDemo = await getTranslations("DemoMode");
  // The shared demo can't set up encryption, export or delete itself (the
  // database refuses anyway); say so instead of offering broken buttons.
  const isDemo = profile?.is_demo === true;
  const demoNote = <p className="text-sm text-muted-foreground">{tDemo("notAvailable")}</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("accountDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            email={user.email ?? ""}
            fullName={user.user_metadata?.full_name ?? ""}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("rentReminders")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RentReminderSettings publicKey={getRentReminderPublicKey()} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("referrals")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralSettings
            referralCode={profile?.referral_code ?? ""}
            referralCount={referralCount ?? 0}
          />
        </CardContent>
      </Card>
      <Card id="encryption" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>{t("encryptedPlotData")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isDemo ? demoNote : <EncryptionSettings
            userId={user.id}
            profile={{
              encryptionEnabled: profile?.encryption_enabled ?? false,
              dekSalt: profile?.dek_salt ?? null,
              dekWrappedByPassphrase:
                profile?.dek_wrapped_by_passphrase ?? null,
              dekWrappedByPassphraseIv:
                profile?.dek_wrapped_by_passphrase_iv ?? null,
            }}
          />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("yourData")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isDemo ? demoNote : <YourDataSettings email={user.email ?? ""} needsPassword={needsPassword(user)} />}
        </CardContent>
      </Card>
    </div>
  );
}
