"use client";

import {
  BookOpen,
  Compass,
  LayoutDashboard,
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
    href: "/collector",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
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
    href: "/collector/discover",
    label: "Discover",
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
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-beige-200 bg-paper px-3 py-6 gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-3 mb-2">
          Collector
        </p>
        {collectorNavLinks.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                active
                  ? "bg-ocean-600 text-paper"
                  : "text-ink/70 hover:text-ink hover:bg-beige-100"
              }`}
            >
              <link.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {link.label}
            </Link>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0 lg:pr-80 pb-20 lg:pb-0">
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b border-beige-200 bg-paper px-4 py-2 no-scrollbar">
          {collectorNavLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-ocean-600 text-paper"
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
      <CollectorBookletCart />
    </div>
  );
}
