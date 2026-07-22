import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileForm from "@/components/profile/ProfileForm";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import EncryptionSettings from "@/components/profile/EncryptionSettings";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "encryption_enabled, dek_salt, dek_wrapped_by_passphrase, dek_wrapped_by_passphrase_iv",
    )
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm email={user.email ?? ""} fullName={user.user_metadata?.full_name ?? ""} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Encrypted plot data</CardTitle>
        </CardHeader>
        <CardContent>
          <EncryptionSettings
            userId={user.id}
            profile={{
              encryptionEnabled: profile?.encryption_enabled ?? false,
              dekSalt: profile?.dek_salt ?? null,
              dekWrappedByPassphrase: profile?.dek_wrapped_by_passphrase ?? null,
              dekWrappedByPassphraseIv: profile?.dek_wrapped_by_passphrase_iv ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
