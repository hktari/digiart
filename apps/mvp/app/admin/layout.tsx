"use client";

import {
  Bell,
  BookOpen,
  CalendarClock,
  DollarSign,
  LayoutDashboard,
  Package,
  Users,
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
    href: "/admin/cycles",
    label: "Cycles",
    icon: CalendarClock,
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
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-beige-200 bg-paper px-3 py-6 gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 px-3 mb-2">
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
                  ? "bg-jade-600 text-paper"
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
          {adminNavLinks.map((link) => {
            const active = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-jade-600 text-paper"
                    : "text-ink/70 hover:text-ink hover:bg-beige-100"
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
