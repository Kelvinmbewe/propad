"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AuroraThemeToggle, Button, cn } from "@propad/ui";

const navLinks = [
  { href: "/listings?intent=FOR_SALE", label: "Buy" },
  { href: "/listings?intent=TO_RENT", label: "Rent" },
  { href: "/agencies", label: "Agents" },
  { href: "/dashboard/advertiser", label: "Advertise" },
  { href: "#trust", label: "How verification works" },
];

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 text-foreground backdrop-blur-xl transition-all duration-500",
        isScrolled && "shadow-[0_16px_60px_-30px_rgba(15,23,42,0.35)]",
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          PropAd<span className="text-emerald-500">.</span>
        </Link>
        <div className="hidden items-center gap-10 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative pb-1 text-foreground transition-colors duration-[var(--motion-duration)] ease-[var(--motion-ease)] hover:text-foreground/80 focus-visible:text-foreground/80 after:absolute after:left-1/2 after:bottom-0 after:h-[2px] after:w-full after:-translate-x-1/2 after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-[var(--motion-duration)] after:ease-[var(--motion-ease)] hover:after:scale-x-100 focus-visible:after:scale-x-100"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <AuroraThemeToggle className="rounded-full border border-border bg-card px-3 py-2 text-sm text-card-foreground transition hover:border-emerald-200 hover:text-emerald-600" />
          {status === "loading" ? (
            <Button
              variant="outline"
              disabled
              className="hidden rounded-full border-border bg-card text-card-foreground shadow-[0_0_0_rgba(0,0,0,0)] transition md:inline-flex"
            >
              Loading...
            </Button>
          ) : session ? (
            <>
              <span className="hidden text-sm text-muted-foreground md:inline">
                {session.user?.name || session.user?.email}
              </span>
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden rounded-full border-border bg-card text-card-foreground shadow-[0_0_0_rgba(0,0,0,0)] transition hover:border-red-300 hover:text-red-600 md:inline-flex"
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button
                variant="outline"
                className="hidden rounded-full border-border bg-card text-card-foreground shadow-[0_0_0_rgba(0,0,0,0)] transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/20 md:inline-flex"
              >
                Sign in
              </Button>
            </Link>
          )}
          <Link href="/dashboard">
            <Button className="rounded-full bg-emerald-500 px-6 text-white shadow-[0_15px_45px_-20px_rgba(16,185,129,0.85)] transition hover:bg-emerald-400 hover:shadow-[0_18px_48px_-18px_rgba(45,212,191,0.85)]">
              {session ? "Dashboard" : "List a property"}
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
