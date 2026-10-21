import ThemeToggle from "@/components/system/ThemeToggle";
import LocaleSwitcher from "@/components/system/LocaleSwitcher";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Link from "next/link";
import Logo from "@/components/system/Logo";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const authMessages = Object.fromEntries(
    [
      "ThemeToggle",
      "LocaleSwitcher",
      "ErrorPage",
      "LoginPage",
      "SignupPage",
      "AuthActions",
    ]
      .filter((key) => key in messages)
      .map((key) => [key, messages[key]]),
  );
  return (
    <NextIntlClientProvider messages={authMessages}>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 p-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Logo className="size-8" />
            landlord.
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col justify-center">{children}</div>
      </div>
    </NextIntlClientProvider>
  );
}
