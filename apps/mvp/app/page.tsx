import { ArrowRight, BookOpen, Package, Palette } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center justify-center text-center px-4 py-20 md:py-32 bg-paper">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-ocean-50 text-ocean-700 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
            <BookOpen className="w-3.5 h-3.5" />
            Art subscription platform
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-ink leading-tight">
            Release-led art booklets,{" "}
            <span className="text-ocean-600">delivered</span>
          </h1>
          <p className="mt-6 text-lg text-ink/60 leading-relaxed max-w-xl mx-auto">
            One account lets you publish releases, build a booklet from the
            releases you love, and understand exactly how booklet pricing and
            artist payouts are calculated.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/browse/releases"
              className="inline-flex items-center justify-center gap-2 bg-ocean-600 text-paper text-sm font-medium px-6 py-3 rounded hover:bg-ocean-700 transition-colors"
            >
              Browse releases
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/sign-up"
              className="inline-flex items-center justify-center gap-2 bg-paper-dark text-ink text-sm font-medium px-6 py-3 rounded hover:bg-beige-200 transition-colors border border-beige-200"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-paper-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: Palette,
                title: "Artists publish releases",
                description:
                  "Artists group their work into releases that can stand on their own and feed upcoming booklet cycles.",
              },
              {
                icon: BookOpen,
                title: "You build your booklet",
                description:
                  "Subscribers select complete releases instead of handpicking artworks one by one.",
              },
              {
                icon: Package,
                title: "Costs stay transparent",
                description:
                  "Every order makes the print, shipping, tax, platform fee, and artist payout contribution visible before checkout.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="flex flex-col items-center text-center gap-4 p-6"
              >
                <div className="w-12 h-12 rounded-full bg-ocean-100 flex items-center justify-center">
                  <step.icon
                    className="w-5 h-5 text-ocean-600"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-ink/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-paper">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink">
            Ready to publish or collect?
          </h2>
          <p className="mt-4 text-ink/60">
            Start with one account, then turn on the parts of the platform you
            want to use.
          </p>
          <Link
            href="/auth/sign-up"
            className="mt-8 inline-flex items-center gap-2 bg-ocean-600 text-paper text-sm font-medium px-8 py-3 rounded hover:bg-ocean-700 transition-colors"
          >
            Create your account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
