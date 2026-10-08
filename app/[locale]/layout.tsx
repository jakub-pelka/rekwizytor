import type { Metadata } from "next";
import { Geist, Courier_Prime } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import { AppShell } from "@/components/AppShell";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MotionProvider } from "@/components/rk/MotionProvider";
import { THEME_INLINE_SCRIPT } from "@/lib/theme";
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INLINE_SCRIPT }} />
        {/* Poziom ruchu od pierwszego renderu, żeby animacje nie mignęły (lib/motion.ts, detectMotionLevel). */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('rk_motion_pref');if(p==='full'||p==='lite'){document.documentElement.dataset.motion=p;return;}var m='lite',n=navigator,c=window.CSS,rm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches,a=localStorage.getItem('rk_motion_auto');if(!rm&&a!=='lite'&&(!n||!n.hardwareConcurrency||n.hardwareConcurrency>2)&&(!n||!n.deviceMemory||n.deviceMemory>2)&&(!n||!n.connection||!n.connection.saveData)&&(c&&c.supports&&c.supports('clip-path','inset(0 0 100% 0)'))){m='full';}document.documentElement.dataset.motion=m;}catch(e){document.documentElement.dataset.motion='lite';}})();` }} />
      </head>
      <body className="rk antialiased">
        <ToastProvider />
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <MotionProvider>
              <AppShell>{children}</AppShell>
            </MotionProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
