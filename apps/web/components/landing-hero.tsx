'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { Button, Input, Label } from '@propad/ui';
import { Sparkles } from 'lucide-react';

export interface FloatingHeroCard {
  title: string;
  description: string;
  accent: string;
}

export function LandingHero({ cards }: { cards: FloatingHeroCard[] }) {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start end', 'end start'] });

  return (
    <section
      ref={heroRef}
      className="relative isolate overflow-hidden rounded-[40px] border border-white/10 bg-slate-900/40 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.85)]"
    >
      <Image
        src="https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1600&q=80"
        alt="Luxury penthouse with city skyline"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(0,150,136,0.7),rgba(43,108,176,0.85))]" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-20 pt-32 sm:px-12 lg:px-16">
        <div className="flex max-w-3xl flex-col gap-6 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#FF6F61,#9F7AEA)] px-4 py-2 text-xs uppercase tracking-[0.35em] text-white shadow-[0_0_10px_rgba(0,150,136,0.2)]">
            <Sparkles className="h-3.5 w-3.5" />
            Harare · Curated living
          </span>
          <h1 className="bg-[linear-gradient(135deg,#009688,#2B6CB0)] bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl lg:text-6xl">
            Discover Zimbabwe's new address for aspirational real estate.
          </h1>
          <p className="max-w-2xl text-lg text-emerald-50/80 sm:text-xl">
            PropAd pairs cinematic imagery with intelligent search so every listing feels personal and every viewing is perfectly choreographed.
          </p>
        </div>
        <form
          className="grid gap-4 rounded-full border border-white/30 bg-white/20 p-3 backdrop-blur-[10px] sm:grid-cols-[2fr_1.3fr_1.3fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = '/properties';
          }}
        >
          <div className="flex flex-col gap-1 rounded-full bg-white/5 px-4 py-2">
            <Label htmlFor="hero-location" className="text-[11px] uppercase tracking-widest text-white/70">
              Location
            </Label>
            <Input
              id="hero-location"
              placeholder="Borrowdale, Harare"
              className="h-9 rounded-full border-none bg-transparent px-0 text-sm text-white placeholder:text-white/60 focus-visible:ring-[#009688]"
            />
          </div>
          <div className="flex flex-col gap-1 rounded-full bg-white/5 px-4 py-2">
            <Label htmlFor="hero-type" className="text-[11px] uppercase tracking-widest text-white/70">
              Property type
            </Label>
            <select
              id="hero-type"
              defaultValue="luxury"
              className="h-9 w-full rounded-full border-none bg-transparent text-sm text-white outline-none focus:ring-2 focus:ring-[#009688]"
            >
              <option value="luxury" className="text-slate-900">
                Luxury home
              </option>
              <option value="villa" className="text-slate-900">
                Villa
              </option>
              <option value="apartment" className="text-slate-900">
                Apartment
              </option>
            </select>
          </div>
          <div className="flex flex-col gap-1 rounded-full bg-white/5 px-4 py-2">
            <Label htmlFor="hero-budget" className="text-[11px] uppercase tracking-widest text-white/70">
              Budget
            </Label>
            <select
              id="hero-budget"
              defaultValue="2000"
              className="h-9 w-full rounded-full border-none bg-transparent text-sm text-white outline-none focus:ring-2 focus:ring-[#009688]"
            >
              <option value="2000" className="text-slate-900">
                Up to US$2,000/mo
              </option>
              <option value="5000" className="text-slate-900">
                Up to US$5,000/mo
              </option>
              <option value="10000" className="text-slate-900">
                Above US$10,000
              </option>
            </select>
          </div>
          <Button type="submit" className="h-full rounded-full border-2 border-[#2EFEA5] bg-[linear-gradient(135deg,#009688,#2B6CB0)] px-8 text-base font-semibold text-white shadow-[0_18px_42px_-18px_rgba(0,150,136,0.65)] transition hover:shadow-[0_20px_48px_-18px_rgba(43,108,176,0.65)]">
            Search
          </Button>
        </form>
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <FloatingHeroCardItem
              key={card.title}
              card={card}
              index={index}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FloatingHeroCardItem({
  card,
  index,
  progress
}: {
  card: FloatingHeroCard;
  index: number;
  progress: MotionValue<number>;
}) {
  const y = useTransform(progress, (value) => -value * (80 + index * 20));

  return (
    <motion.div
      style={{ y }}
      className="rounded-3xl border border-white/10 bg-white/20 p-6 text-white shadow-[0_0_10px_rgba(0,150,136,0.2)] backdrop-blur-[10px]"
    >
      <span className="text-xs font-medium uppercase tracking-[0.4em] text-white/60">{card.accent}</span>
      <h3 className="mt-3 text-xl font-semibold">{card.title}</h3>
      <p className="mt-2 text-sm text-white/75">{card.description}</p>
    </motion.div>
  );
}
