import type { Metadata } from "next";
import {
  Crimson_Pro,
  Manrope,
  Indie_Flower,
  Pompiere,
  DM_Sans,
} from "next/font/google";
import "./globals.css";

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

const indieFlower = Indie_Flower({
  variable: "--font-indie-flower",
  subsets: ["latin"],
  weight: ["400"],
});

const pompiere = Pompiere({
  variable: "--font-pompiere",
  subsets: ["latin"],
  weight: ["400"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Monthly Booklet Drops | Turn Your Art into Collectible Subscriptions",
  description:
    "Connect digital artists with collectors through monthly printed booklet subscriptions. Artists curate, we print and ship. Join the waitlist.",
  openGraph: {
    title:
      "Monthly Booklet Drops | Turn Your Art into Collectible Subscriptions",
    description:
      "Connect digital artists with collectors through monthly printed booklet subscriptions. Artists curate, we print and ship. Join the waitlist.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Monthly Booklet Drops",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Monthly Booklet Drops | Turn Your Art into Collectible Subscriptions",
    description:
      "Connect digital artists with collectors through monthly printed booklet subscriptions. Artists curate, we print and ship. Join the waitlist.",
    images: ["/twitter-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="4238abba-dd34-4eac-a883-e27d39be443f"
        ></script>
      </head>
      <body
        className={`${crimsonPro.variable} ${manrope.variable} ${indieFlower.variable} ${pompiere.variable} ${dmSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
