import { Fragment } from 'react';
import { cn } from '../../utils';

type AuroraMetricCardProps = {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  tone?: 'accent' | 'success' | 'warning';
};

export function AuroraMetricCard({ label, value, delta, trend, tone = 'accent' }: AuroraMetricCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] p-6 shadow-aurora">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--aurora-color-text-subtle)]">{label}</p>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-3xl font-semibold text-[color:var(--aurora-color-text)]">{value}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
            tone === 'accent' && 'bg-[color:var(--aurora-color-accent)]/10 text-[color:var(--aurora-color-accent)]',
            tone === 'success' && 'bg-emerald-500/10 text-emerald-400',
            tone === 'warning' && 'bg-amber-500/10 text-amber-400'
          )}
        >
          <span aria-hidden>{trend === 'up' ? '↑' : '↓'}</span>
          {delta}
        </span>
      </div>
    </article>
  );
}

const chartGradientStops = [
  { offset: '0%', color: 'var(--aurora-chart-primary)', opacity: 0.35 },
  { offset: '60%', color: 'var(--aurora-chart-secondary)', opacity: 0.25 },
  { offset: '100%', color: 'var(--aurora-chart-tertiary)', opacity: 0.15 }
];

const chartLine = [
  { x: 0, y: 120 },
  { x: 60, y: 90 },
  { x: 120, y: 110 },
  { x: 180, y: 70 },
  { x: 240, y: 85 },
  { x: 300, y: 40 },
  { x: 360, y: 60 }
];

type AuroraPerformanceChartProps = {
  title: string;
  description: string;
};

export function AuroraPerformanceChart({ title, description }: AuroraPerformanceChartProps) {
  const path = chartLine
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-highest)] p-6 shadow-aurora">
      <div className="absolute inset-x-6 top-6 h-24 rounded-3xl bg-[color:var(--aurora-color-accent)]/10 blur-3xl" />
      <header className="relative flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-[color:var(--aurora-color-text)]">{title}</h2>
        <p className="text-sm text-[color:var(--aurora-color-text-muted)]">{description}</p>
      </header>
      <svg viewBox="0 0 360 160" className="relative mt-8 h-48 w-full">
        <defs>
          <linearGradient id="auroraGradient" x1="0%" x2="100%" y1="0%" y2="0%">
            {chartGradientStops.map((stop) => (
              <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
            ))}
          </linearGradient>
        </defs>
        <path d={`${path} L 360 160 L 0 160 Z`} fill="url(#auroraGradient)" />
        <path d={path} fill="none" stroke="var(--aurora-color-accent-strong)" strokeWidth={4} strokeLinecap="round" />
        {chartLine.map((point, index) => (
          <Fragment key={index}>
            <circle cx={point.x} cy={point.y} r={5} fill="var(--aurora-color-accent-on)" stroke="var(--aurora-color-accent-strong)" strokeWidth={3} />
          </Fragment>
        ))}
      </svg>
      <footer className="relative mt-6 grid gap-3 md:grid-cols-3">
        {[
          { label: 'Conversion rate', value: '62%' },
          { label: 'Time to approve', value: '3h 12m' },
          { label: 'Avg. ticket', value: '$184' }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[color:var(--aurora-color-text)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--aurora-color-text-subtle)]">
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold">{item.value}</p>
          </div>
        ))}
      </footer>
    </section>
  );
}

type AuroraPipelineModalProps = {
  title: string;
  items: Array<{ title: string; description: string; status: 'pending' | 'inProgress' | 'complete' }>;
};

export function AuroraPipelineModal({ title, items }: AuroraPipelineModalProps) {
  return (
    <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] shadow-aurora">
      <header className="bg-[color:var(--aurora-color-highest)]/90 px-6 py-5 backdrop-blur">
        <h3 className="text-lg font-semibold text-[color:var(--aurora-color-text)]">{title}</h3>
      </header>
      <div className="divide-y divide-[color:var(--aurora-color-border)]/60">
        {items.map((item) => (
          <div key={item.title} className="grid gap-2 px-6 py-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--aurora-color-text)]">{item.title}</p>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold capitalize',
                  item.status === 'pending' && 'bg-amber-500/10 text-amber-400',
                  item.status === 'inProgress' && 'bg-[color:var(--aurora-color-accent)]/10 text-[color:var(--aurora-color-accent)]',
                  item.status === 'complete' && 'bg-emerald-500/10 text-emerald-400'
                )}
              >
                {item.status.replace(/([A-Z])/g, ' $1')}
              </span>
            </div>
            <p className="text-sm text-[color:var(--aurora-color-text-muted)]">{item.description}</p>
          </div>
        ))}
      </div>
      <footer className="flex items-center justify-between gap-3 px-6 py-5">
        <button className="inline-flex items-center gap-2 rounded-full border border-[color:var(--aurora-color-border)] bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--aurora-color-text)] transition hover:bg-white/20">
          Dismiss
        </button>
        <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--aurora-color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--aurora-color-accent-on)] shadow-aurora transition hover:-translate-y-0.5 hover:shadow-auroraBold">
          Advance pipeline
        </button>
      </footer>
    </div>
  );
}

type AuroraInlineFormProps = {
  heading: string;
};

export function AuroraInlineForm({ heading }: AuroraInlineFormProps) {
  return (
    <form className="grid gap-4 rounded-3xl border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-highest)] p-6 shadow-aurora">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--aurora-color-text)]">{heading}</h3>
          <p className="text-sm text-[color:var(--aurora-color-text-muted)]">
            Configure payout guardrails that keep your treasury team in control.
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--aurora-color-border)] bg-[color:var(--aurora-color-elevated)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--aurora-color-text-subtle)]">
          Secure
        </span>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[color:var(--aurora-color-text)]">Maximum payout per batch</span>
        <input
          type="number"
          defaultValue={1500}
          className="w-full rounded-2xl border border-transparent bg-[color:var(--aurora-color-input)] px-4 py-3 text-sm text-[color:var(--aurora-color-text)] outline-none transition focus:border-[color:var(--aurora-color-accent)] focus:bg-[color:var(--aurora-color-elevated)] focus:shadow-auroraFocus"
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[color:var(--aurora-color-text)]">Auto pause threshold</span>
          <input
            type="number"
            defaultValue={3}
            className="w-full rounded-2xl border border-transparent bg-[color:var(--aurora-color-input)] px-4 py-3 text-sm text-[color:var(--aurora-color-text)] outline-none transition focus:border-[color:var(--aurora-color-accent)] focus:bg-[color:var(--aurora-color-elevated)] focus:shadow-auroraFocus"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-[color:var(--aurora-color-text)]">Approval window (hours)</span>
          <input
            type="number"
            defaultValue={12}
            className="w-full rounded-2xl border border-transparent bg-[color:var(--aurora-color-input)] px-4 py-3 text-sm text-[color:var(--aurora-color-text)] outline-none transition focus:border-[color:var(--aurora-color-accent)] focus:bg-[color:var(--aurora-color-elevated)] focus:shadow-auroraFocus"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-[color:var(--aurora-color-text)]">Escalation contact</span>
        <input
          type="email"
          defaultValue="finance@propad.co.zw"
          className="w-full rounded-2xl border border-transparent bg-[color:var(--aurora-color-input)] px-4 py-3 text-sm text-[color:var(--aurora-color-text)] outline-none transition focus:border-[color:var(--aurora-color-accent)] focus:bg-[color:var(--aurora-color-elevated)] focus:shadow-auroraFocus"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-3 text-sm text-[color:var(--aurora-color-text)]">
          <span className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-[color:var(--aurora-color-input)]">
            <input type="checkbox" defaultChecked className="peer sr-only" />
            <span className="absolute left-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[color:var(--aurora-color-accent)] transition-transform duration-300 ease-aurora-spring peer-checked:translate-x-4" />
          </span>
          Require multi-approver sign-off
        </label>
        <div className="flex gap-3">
          <button type="button" className="rounded-full border border-[color:var(--aurora-color-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--aurora-color-text)]">
            Cancel
          </button>
          <button type="submit" className="rounded-full bg-[color:var(--aurora-color-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--aurora-color-accent-on)] shadow-aurora transition hover:-translate-y-0.5 hover:shadow-auroraBold">
            Save policy
          </button>
        </div>
      </div>
    </form>
  );
}
