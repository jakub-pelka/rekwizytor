import type { Metadata } from "next";
import { Geist, Courier_Prime } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import { AppShell } from "@/components/AppShell";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from '@/components/providers/ToastProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
});

const boldonse = localFont({
  src: "../../public/fonts/Boldonse-Regular.ttf",
  variable: "--font-boldonse",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rekwizytor",
  description: "Narzędzie dla teatru",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${courierPrime.variable} ${boldonse.variable}`}
    >
      <body className="rk antialiased">
        <ToastProvider />
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <AppShell>{children}</AppShell>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
