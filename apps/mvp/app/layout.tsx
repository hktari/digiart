import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Art Subscription Platform",
  description: "Monthly curated art booklets from independent creators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-beige-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
