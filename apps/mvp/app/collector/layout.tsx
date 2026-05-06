"use client";

import {
  BookOpen,
  Compass,
  Lock,
  Package,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CollectorBookletCart } from "@/components/collector-booklet-cart";

const collectorNavLinks = [
  {
    href: "/collector/subscriptions",
    label: "Subscriptions",
    icon: Users,
    exact: false,
  },
  {
    href: "/collector/releases",
    label: "Releases",
    icon: Package,
    exact: false,
  },
  {
    href: "/browse",
    label: "Browse",
    icon: Compass,
    exact: false,
  },
  {
    href: "/collector/pricing",
    label: "Pricing",
    icon: BookOpen,
    exact: false,
  },
  {
    href: "/collector/lock-status",
    label: "Lock status",
    icon: Lock,
    exact: false,
  },
  {
    href: "/collector/setup",
    label: "Setup",
    icon: Settings,
    exact: false,
  },
];

export default function CollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-beige-200 bg-paper px-3 py-6 md:flex">
        <Link
          href="/"
          className="px-3 py-2 text-xs font-medium text-ink/50 hover:text-ink"
        >
          Dashboard
        </Link>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-ink/40">
          Booklets
        </p>
        {collectorNavLinks.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-ocean-600 text-paper"
                  : "text-ink/70 hover:bg-beige-100 hover:text-ink"
              }`}
            >
              <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {link.label}
            </Link>
          );
        })}
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pr-80 lg:pb-0">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-beige-200 bg-paper px-4 py-2 md:hidden">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap text-ink/70 transition-colors hover:bg-beige-100 hover:text-ink"
          >
            Dashboard
          </Link>
          {collectorNavLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-ocean-600 text-paper"
                    : "text-ink/70 hover:bg-beige-100 hover:text-ink"
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
      <CollectorBookletCart />
    </div>
  );
}
