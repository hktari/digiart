"use client";

import { Package, Share2, User, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const creatorNavLinks = [
  { href: "/creator/profile", label: "Profile", icon: User, exact: false },
  { href: "/creator/releases", label: "Releases", icon: Package, exact: false },
  { href: "/creator/payout", label: "Payouts", icon: Wallet, exact: false },
  { href: "/creator/share", label: "Share", icon: Share2, exact: false },
];

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r bg-muted px-3 py-6 md:flex">
        <Link
          href="/"
          className="px-3 py-2 text-xs font-medium text-foreground/50 hover:text-foreground"
        >
          Dashboard
        </Link>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Publishing
        </p>
        {creatorNavLinks.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-fuchsia-600 text-background"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {link.label}
            </Link>
          );
        })}
      </aside>

      <div className="min-w-0 flex-1">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b bg-muted px-4 py-2 md:hidden">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          >
            Dashboard
          </Link>
          {creatorNavLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-fuchsia-600 text-background"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                <link.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
