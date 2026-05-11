import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  Platform: [
    { href: "/browse", label: "Browse" },
    { href: "/auth/sign-up", label: "Get Started" },
  ],
  Account: [
    { href: "/auth/sign-in", label: "Sign in" },
    { href: "/", label: "Dashboard" },
    { href: "/account/roles", label: "Manage Roles" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo.png"
                alt="Booklet Drops"
                width={256}
                height={256}
                className="h-16 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground/70 leading-relaxed max-w-xs">
              Connecting digital artists with collectors through monthly printed
              booklet subscriptions.
            </p>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-4">
                {section}
              </h3>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground/80 hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground/50">
          <p>
            &copy; {new Date().getFullYear()} Booklet Drops. All rights
            reserved.
          </p>
          <p>
            Built by{" "}
            <a
              href="https://www.bostjankamnik.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermilion hover:text-vermilion/80 transition-colors"
            >
              bo | ka
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
