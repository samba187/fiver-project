import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { APP_VERSION } from "@/lib/version";
import "./globals.css";

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const _oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FIVEUR ARENA | Complexe Five-a-Side - Nouakchott",
  description:
    "FIVEUR ARENA - Complexe de football Five-a-Side a Nouakchott. Reservez votre terrain, inscrivez vos enfants a notre academie, et decouvrez nos actions solidaires.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${_inter.variable} ${_oswald.variable} font-sans antialiased overflow-x-hidden`}
      >
        {children}
        <div className="fixed bottom-2 right-2 text-[10px] text-white/20 font-mono pointer-events-none z-50">
          {APP_VERSION}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
