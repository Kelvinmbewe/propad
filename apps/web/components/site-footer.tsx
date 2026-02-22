import { Instagram, Linkedin, Twitter } from "lucide-react";

export function SiteFooter({
  showFollow = true,
  showVerificationLink = true,
}: {
  showFollow?: boolean;
  showVerificationLink?: boolean;
}) {
  return (
    <footer
      id="contact"
      className="mt-16 bg-gradient-to-br from-slate-950 via-emerald-900 to-cyan-900 py-14 text-white"
    >
      <div className="mx-auto w-full max-w-6xl px-6 sm:px-12 lg:px-16">
        <div
          className={`grid gap-10 ${showFollow ? "md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]" : "md:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]"}`}
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-200">
              PropAd Zimbabwe
            </p>
            <p className="text-lg font-semibold">
              Aspirational real estate, choreographed end-to-end.
            </p>
            <p className="text-sm text-emerald-100/80">
              hello@propad.co.zw · +263 77 000 1234
            </p>
          </div>

          <div className="space-y-3 text-sm text-emerald-100/80">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
              Properties
            </p>
            <div className="flex flex-col gap-2">
              <a href="/listings?intent=FOR_SALE">Properties for sale</a>
              <a href="/listings?intent=TO_RENT">Properties for rent</a>
              <a href="/listings">Browse all</a>
            </div>
          </div>

          <div className="space-y-3 text-sm text-emerald-100/80">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
              Partners
            </p>
            <div className="flex flex-col gap-2">
              <a href="/agencies">Agents & agencies</a>
              <a href="/dashboard/verification">Verification</a>
              <a href="/dashboard/advertiser">Advertise</a>
            </div>
          </div>

          <div className="space-y-3 text-sm text-emerald-100/80">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
              About
            </p>
            <div className="flex flex-col gap-2">
              <a href="/about">About PropAd</a>
              {showVerificationLink ? (
                <a href="#trust">How verification works</a>
              ) : null}
              <a href="/contact">Contact</a>
            </div>
          </div>

          {showFollow ? (
            <div className="space-y-3 text-sm text-emerald-100/80">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
                Follow
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://twitter.com"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                >
                  <Twitter className="h-4 w-4" />
                </a>
                <a
                  href="https://instagram.com"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
              <p className="text-xs">
                Ad disclosure: Sponsored listings are marked.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-emerald-100/70 sm:flex-row">
          <p>© {new Date().getFullYear()} PropAd. All rights reserved.</p>
          <p>Built for Zimbabwe&apos;s verified property marketplace.</p>
        </div>
      </div>
    </footer>
  );
}
