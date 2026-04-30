"use client";

import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/browse/creators", label: "Creators" },
  { href: "/browse/releases", label: "Releases" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isAdmin = session?.user?.roles?.includes("ADMIN") ?? false;
  const isCollector = session?.user?.roles?.includes("COLLECTOR") ?? false;
  const isCreator = session?.user?.roles?.includes("CREATOR") ?? false;
  const hasWorkspace = isCreator || isCollector;
  const isWorkspacePath =
    pathname === "/" ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/creator") ||
    pathname.startsWith("/collector");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-beige-200 bg-paper/95 shadow-sm backdrop-blur-sm"
            : "border-b border-beige-100 bg-paper"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between md:h-18">
            <Link
              href="/"
              className="flex items-center gap-2 font-serif text-xl font-bold text-ink transition-colors hover:text-ocean-600"
            >
              <BookOpen className="h-5 w-5 text-ocean-600" strokeWidth={1.5} />
              <span className="hidden sm:inline">Booklet Drops</span>
              <span className="sm:hidden">BD</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-ocean-600 text-paper"
                      : "text-ink/70 hover:bg-beige-100 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {hasWorkspace && (
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 rounded px-4 py-2 text-sm font-medium transition-colors ${
                    isWorkspacePath
                      ? "bg-fuchsia-600 text-paper"
                      : "text-ink/70 hover:bg-beige-100 hover:text-ink"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 rounded px-4 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin")
                      ? "bg-jade-600 text-paper"
                      : "text-ink/70 hover:bg-beige-100 hover:text-ink"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Admin
                </Link>
              )}
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/account/roles"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
                  >
                    <User className="h-4 w-4" />
                    {session?.user?.name || session?.user?.email}
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/sign-in"
                    className="px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="rounded bg-ocean-600 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ocean-700"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded p-2 text-ink/70 transition-colors hover:bg-beige-100 hover:text-ink md:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-x-0 top-16 z-40 border-b border-beige-200 bg-paper shadow-lg transition-all duration-300 ease-in-out md:hidden ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        aria-hidden={!mobileOpen}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-4 py-3 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-ocean-600 text-paper"
                  : "text-ink/80 hover:bg-beige-100 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {hasWorkspace && (
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded px-4 py-3 text-sm font-medium transition-colors ${
                isWorkspacePath
                  ? "bg-fuchsia-600 text-paper"
                  : "text-ink/80 hover:bg-beige-100 hover:text-ink"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
              Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 rounded px-4 py-3 text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-jade-600 text-paper"
                  : "text-ink/80 hover:bg-beige-100 hover:text-ink"
              }`}
            >
              <Settings className="h-4 w-4" strokeWidth={1.5} />
              Admin
            </Link>
          )}
          <div className="mt-3 flex flex-col gap-2 border-t border-beige-200 pt-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/account/roles"
                  className="rounded px-4 py-3 text-sm font-medium text-ink/80 transition-colors hover:bg-beige-100 hover:text-ink"
                >
                  {session?.user?.name || session?.user?.email}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="px-4 py-3 text-left text-sm font-medium text-ink/70 transition-colors hover:bg-beige-100 hover:text-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="rounded px-4 py-3 text-sm font-medium text-ink/70 transition-colors hover:bg-beige-100 hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="rounded bg-ocean-600 px-4 py-3 text-center text-sm font-medium text-paper transition-colors hover:bg-ocean-700"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
