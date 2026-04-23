"use client";

import { BookOpen, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/discover", label: "Discover" },
  { href: "/artists", label: "Artists" },
  { href: "/subscriptions", label: "My Subscriptions" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

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
            ? "bg-paper/95 backdrop-blur-sm shadow-sm border-b border-beige-200"
            : "bg-paper border-b border-beige-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            <Link
              href="/"
              className="flex items-center gap-2 font-serif font-bold text-xl text-ink hover:text-ocean-600 transition-colors"
            >
              <BookOpen className="w-5 h-5 text-ocean-600" strokeWidth={1.5} />
              <span className="hidden sm:inline">Booklet Drops</span>
              <span className="sm:hidden">BD</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-ocean-600 text-paper"
                      : "text-ink/70 hover:text-ink hover:bg-beige-100"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 text-sm font-medium text-ink/70 hover:text-ink transition-colors px-3 py-2"
                  >
                    <User className="w-4 h-4" />
                    {session?.user?.name || session?.user?.email}
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 text-sm font-medium text-ink/70 hover:text-ink transition-colors px-3 py-2"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/sign-in"
                    className="text-sm font-medium text-ink/70 hover:text-ink transition-colors px-3 py-2"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/sign-in"
                    className="text-sm font-medium bg-ocean-600 text-paper px-4 py-2 rounded hover:bg-ocean-700 transition-colors"
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
              className="md:hidden p-2 rounded text-ink/70 hover:text-ink hover:bg-beige-100 transition-colors"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
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
        className={`fixed top-16 inset-x-0 z-40 bg-paper border-b border-beige-200 shadow-lg md:hidden transition-all duration-300 ease-in-out ${
          mobileOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-3 rounded text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-ocean-600 text-paper"
                  : "text-ink/80 hover:text-ink hover:bg-beige-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-beige-200 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/account"
                  className="px-4 py-3 rounded text-sm font-medium text-ink/80 hover:text-ink hover:bg-beige-100 transition-colors"
                >
                  {session?.user?.name || session?.user?.email}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-3 rounded text-sm font-medium text-ink/70 hover:text-ink hover:bg-beige-100 transition-colors text-left"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/sign-in"
                  className="px-4 py-3 rounded text-sm font-medium text-ink/70 hover:text-ink hover:bg-beige-100 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-in"
                  className="px-4 py-3 rounded text-sm font-medium bg-ocean-600 text-paper hover:bg-ocean-700 transition-colors text-center"
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
