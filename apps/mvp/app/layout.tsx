import type { Metadata } from "next";
import { Crimson_Pro, Manrope, Outfit, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PostHogIdentifier } from "@/components/providers/posthog-identifier";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const outfitHeading = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.printfeed.btechhub.top"),
  title: {
    default: "PrintFeed — Digital Art Booklet Subscription Platform",
    template: "%s | PrintFeed",
  },
  description:
    "PrintFeed turns your feed into print. Subscribe to artists you already follow and receive curated A5 booklet drops delivered to your home every month.",
  keywords: [
    "printfeed",
    "printfeed app",
    "digital art subscription",
    "art booklet subscription",
    "printed art drops",
    "subscribe to digital artists",
    "art booklet drop",
  ],
  openGraph: {
    title: "PrintFeed — Digital Art Booklet Subscription Platform",
    description:
      "PrintFeed turns your feed into print. Subscribe to artists you already follow and receive curated A5 booklet drops delivered to your home.",
    type: "website",
    url: "https://app.printfeed.btechhub.top",
    siteName: "PrintFeed",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PrintFeed — turn your feed into print",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrintFeed — Digital Art Booklet Subscription Platform",
    description:
      "PrintFeed turns your feed into print. Subscribe to artists you already follow and receive curated A5 booklet drops delivered to your home.",
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", sourceSans3.variable, outfitHeading.variable)}
    >
      <body
        className={`${crimsonPro.variable} ${manrope.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TooltipProvider>
              <PostHogIdentifier />
              <AppShell>{children}</AppShell>
              <Toaster />
              {/* {process.env.AUTH_BYPASS_TEST_USER_ID && <DevRoleSwitcher />} */}
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
