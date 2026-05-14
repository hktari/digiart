"use client";

import {
  Bell,
  BookOpen,
  CalendarClock,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  UserRoundSearch,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavLinks = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/creators",
    label: "Creators",
    icon: Users,
    exact: false,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: UserRoundSearch,
    exact: false,
  },
  {
    href: "/admin/cycles",
    label: "Cycles",
    icon: CalendarClock,
    exact: false,
  },
  {
    href: "/admin/payouts",
    label: "Payouts",
    icon: Wallet,
    exact: false,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingBag,
    exact: false,
  },
  {
    href: "/admin/pod",
    label: "POD",
    icon: Package,
    exact: false,
  },
  {
    href: "/admin/booklet-constraints",
    label: "Constraints",
    icon: BookOpen,
    exact: false,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: Bell,
    exact: false,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    exact: false,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r bg-muted px-3 py-6 gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">
          Admin
        </p>
        {adminNavLinks.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors ${
                active
                  ? "bg-jade-600 text-background"
                  : "text-foreground/70 hover:text-foreground hover:bg-accent"
              }`}
            >
              <link.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              {link.label}
            </Link>
          );
        })}
      </aside>

      <div className="flex-1 min-w-0">
        <nav className="md:hidden flex gap-1 overflow-x-auto border-b bg-muted px-4 py-2 no-scrollbar">
          {adminNavLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-jade-600 text-background"
                    : "text-foreground/70 hover:text-foreground hover:bg-accent"
                }`}
              >
                <link.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-6 md:p-8">{children}</div>
      </div>
    </div>
  );
}
