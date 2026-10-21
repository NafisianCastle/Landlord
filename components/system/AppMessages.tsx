import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/** Keep feature translations off the public landing page's hydration payload. */
export default async function AppMessages({
  children,
}: {
  children: React.ReactNode;
}) {
  const { LandingPage: _landing, ...messages } = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
