import type { Metadata } from "next";
import { Crimson_Pro, Manrope, Outfit, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PostHogIdentifier } from "@/components/providers/posthog-identifier";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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
  title: "Booklet Drops — Art Subscription Platform",
  description:
    "Turn digital art into printed booklet experiences. Subscribe to artists you already follow and receive curated A5 booklet drops, delivered straight to your home",
  openGraph: {
    title: "Booklet Drops — Art Subscription Platform",
    description:
      "Turn digital art into printed booklet experiences. Subscribe to artists you already follow and receive curated A5 booklet drops, delivered straight to your home",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Booklet Drops — Art Subscription Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Booklet Drops — Art Subscription Platform",
    description:
      "Turn digital art into printed booklet experiences. Subscribe to artists you already follow and receive curated A5 booklet drops, delivered straight to your home",
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
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <BreadcrumbNav />
                  </header>
                  <div className="flex flex-1 flex-col">
                    {children}
                    <Footer />
                  </div>
                </SidebarInset>
              </SidebarProvider>
              <Toaster />
              {/* {process.env.AUTH_BYPASS_TEST_USER_ID && <DevRoleSwitcher />} */}
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
