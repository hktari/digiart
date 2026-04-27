"use client";

import {
  ImageIcon,
  LayoutDashboard,
  Package,
  Share2,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const creatorNavLinks = [
  { href: "/creator", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/creator/profile", label: "Profile", icon: User, exact: false },
  {
    href: "/creator/artworks",
    label: "Artworks",
    icon: ImageIcon,
    exact: false,
  },
  { href: "/creator/releases", label: "Releases", icon: Package, exact: false },
  { href: "/creator/payout", label: "Payout", icon: Wallet, exact: false },
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
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-beige-200 bg-paper px-3 py-6 gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-3 mb-2">
          Creator
        </p>
        {creatorNavLinks.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                active
                  ? "bg-fuchsia-600 text-paper"
                  : "text-ink/70 hover:text-ink hover:bg-beige-100"
              }`}
            >
              <link.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {link.label}
            </Link>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0">
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-beige-200 bg-paper px-4 py-2 no-scrollbar">
          {creatorNavLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-fuchsia-600 text-paper"
                    : "text-ink/70 hover:text-ink hover:bg-beige-100"
                }`}
              >
                <link.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
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
