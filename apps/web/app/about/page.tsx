import { Metadata } from 'next';
import { Award, Building2, Globe2, HeartHandshake, Users } from 'lucide-react';
import { LandingNav } from '@/components/landing-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@propad/ui';

export const metadata: Metadata = {
  title: 'About PropAd | PropAd',
  description: 'Learn how PropAd builds a transparent, zero-fee property marketplace for Zimbabwe.'
};

const milestones = [
  {
    year: '2021',
    heading: 'Aurora design system takes shape',
    description:
      'We codified Aurora tokens to guarantee WCAG contrast, light/dark parity, and rapid customization for partner brands.'
  },
  {
    year: '2022',
    heading: 'Zimbabwe-wide verification network',
    description:
      'PropAd-trained photographers and valuers joined in all major metros, enabling 48 hour listing verification SLAs.'
  },
  {
    year: '2023',
    heading: 'Market telemetry becomes live',
    description:
      'Real-time pricing telemetry and PropAd reward pools launched, helping landlords see transparent performance data.'
  },
  {
    year: 'Today',
    heading: 'Zero-fee marketplace expansion',
    description:
      'We are scaling into Victoria Falls and Mutare while keeping core trading fees at zero for verified landlords.'
  }
];

const values = [
  {
    title: 'Radical transparency',
    description: 'Every listing shows inspection history, rating trends, and direct agent availability.',
    icon: Globe2
  },
  {
    title: 'Community first',
    description: 'Reward pools pay agents, photographers, and landlords fairly for verified, inclusive housing.',
    icon: Users
  },
  {
    title: 'Crafted with care',
    description: 'From glassmorphism nav bars to admin dashboards, every pixel is designed for legibility and joy.',
    icon: HeartHandshake
  }
];

const leadership = [
  {
    name: 'Anesu Jiyane',
    role: 'Founder & CEO',
    bio: 'Architect of the Aurora system and advocate for transparent housing ecosystems across the region.'
  },
  {
    name: 'Tariro Moyo',
    role: 'Head of Market Operations',
    bio: 'Coordinates on-the-ground verification teams ensuring PropAd standards reach every neighbourhood.'
  },
  {
    name: 'Nyasha Chifamba',
    role: 'Product Engineering Lead',
    bio: 'Leads the platform teams building PropAd apps, APIs, and accessible dashboards.'
  }
];

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-aurora-background via-white to-aurora-surface dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <LandingNav />
      <main className="flex flex-col gap-20 pb-24 pt-32">
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 text-center sm:px-12">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-[color:var(--aurora-color-elevated)]/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-aurora-text-subtle shadow-aurora">
            <Award className="h-3.5 w-3.5" /> Our story
          </span>
          <h1 className="text-4xl font-semibold text-aurora-text md:text-5xl">
            PropAd is building the zero-fee property marketplace Zimbabwe deserves.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-aurora-text-muted md:text-lg">
            We empower landlords, agents, and renters with tools that feel cinematic yet stay accessible in both blazing daylight
            and low-light evenings. Aurora tokens tie every experience together.
          </p>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 sm:px-12">
          <div className="grid gap-6 rounded-[32px] border border-aurora-border bg-white/80 p-8 shadow-aurora dark:bg-slate-950/70 md:grid-cols-2">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="rounded-3xl border border-transparent bg-white/70 shadow-none dark:bg-slate-950/60">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--aurora-color-accent)]/10 text-[color:var(--aurora-color-accent)]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <CardTitle className="text-lg text-aurora-text">{value.title}</CardTitle>
                      <p className="mt-1 text-sm text-aurora-text-muted">{value.description}</p>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
            <Card className="rounded-3xl border border-aurora-border bg-[color:var(--aurora-color-elevated)]/90 shadow-aurora">
              <CardHeader>
                <CardTitle className="text-lg text-aurora-text">Impact snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-left text-sm text-aurora-text-muted md:grid-cols-2">
                <div>
                  <p className="text-3xl font-semibold text-aurora-text">12K+</p>
                  <p>Verified property viewings since launch.</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-aurora-text">48 hrs</p>
                  <p>Average time to approve a new listing.</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-aurora-text">95%</p>
                  <p>Customer satisfaction on concierge showings.</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-aurora-text">0%</p>
                  <p>Listing fees charged to verified landlords.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 sm:px-12">
          <div className="rounded-[32px] border border-aurora-border bg-white/80 p-8 shadow-aurora dark:bg-slate-950/70">
            <header className="flex flex-col gap-3 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-aurora-text-subtle">Timeline</p>
              <h2 className="text-3xl font-semibold text-aurora-text">A journey powered by Aurora</h2>
              <p className="text-sm text-aurora-text-muted">
                From Harare to Bulawayo, our platform ships updates weekly. Each milestone below reflects our obsession with
                accessible, data-driven property experiences.
              </p>
            </header>
            <ol className="mt-10 space-y-6 text-left">
              {milestones.map((milestone, index) => (
                <li
                  key={milestone.year}
                  className="relative overflow-hidden rounded-3xl border border-aurora-border/70 bg-white/70 p-6 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.65)] transition hover:-translate-y-1 hover:shadow-auroraBold dark:bg-slate-950/60"
                >
                  <span className="inline-flex items-center rounded-full bg-[color:var(--aurora-color-input)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-aurora-text-subtle">
                    {milestone.year}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-aurora-text">{milestone.heading}</h3>
                  <p className="mt-2 text-sm text-aurora-text-muted">{milestone.description}</p>
                  {index !== milestones.length - 1 && (
                    <span className="pointer-events-none absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-aurora-border to-transparent" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 sm:px-12">
          <div className="rounded-[32px] border border-aurora-border bg-white/80 p-8 shadow-aurora dark:bg-slate-950/70">
            <header className="flex flex-col gap-3 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-aurora-text-subtle">Leadership</p>
              <h2 className="text-3xl font-semibold text-aurora-text">Meet the team stewarding PropAd</h2>
              <p className="text-sm text-aurora-text-muted">
                Cross-functional squads across Zimbabwe power our marketplace, with leadership focused on inclusion, security, and
                delightful housing discovery.
              </p>
            </header>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {leadership.map((leader) => (
                <Card key={leader.name} className="rounded-3xl border border-transparent bg-white/70 shadow-none dark:bg-slate-950/60">
                  <CardHeader>
                    <CardTitle className="text-lg text-aurora-text">{leader.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-aurora-text-muted">
                    <p className="font-semibold text-aurora-text">{leader.role}</p>
                    <p>{leader.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 text-center sm:px-12">
          <Building2 className="h-12 w-12 text-aurora-accent" aria-hidden />
          <h2 className="text-3xl font-semibold text-aurora-text md:text-4xl">Join the Aurora neighbourhood</h2>
          <p className="max-w-2xl text-sm text-aurora-text-muted md:text-base">
            If you are a Zimbabwean builder, agent, or creative who cares about equitable housing, we would love to collaborate.
            PropAd partnerships ship with Aurora theming, design tokens, and admin automation baked in.
          </p>
        </section>
      </main>
    </div>
  );
}
